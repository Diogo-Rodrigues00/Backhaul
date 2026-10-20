import { Router } from "express";
import { emTransacao, pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarEmpresaId, buscarMotoristaId } from "../perfis";
import { type StatusEntrega, validarId, validarStatusEntrega } from "../validacao";

export const rotasFretes = Router();

// Mesmo padrão do propostas.ts: a transação devolve status + corpo e a rota só
// responde depois do COMMIT.
type Resposta = { status: number; corpo: object };

function erro(status: number, mensagem: string): Resposta {
  return { status, corpo: { erro: mensagem } };
}

// Comissão da plataforma. "5.00" vai para o banco como texto (percentual_comissao é
// NUMERIC(5,2)); o número 5 é usado na conta em centavos.
const PERCENTUAL_COMISSAO = 5;

// Para quem cada status pode ir. Status que não aparece aqui (ou lista vazia) = fim
// da linha: nenhuma mudança é permitida a partir dele.
const TRANSICOES: Partial<Record<StatusEntrega, readonly StatusEntrega[]>> = {
  aceito: ["em_transito"],
  em_transito: ["entregue"],
  entregue: [],
  cancelado: [],
};

function transicaoPermitida(atual: StatusEntrega, novo: StatusEntrega): boolean {
  return (TRANSICOES[atual] ?? []).includes(novo);
}

// "3500.00" (como o pg entrega um NUMERIC) → 350000. Só conta com inteiros:
// nada de parseFloat, que transformaria 0.1 em 0.1000000000000000055...
function textoParaCentavos(valor: string): number {
  const [reais, centavos = ""] = valor.split(".");
  return Number(reais) * 100 + Number(centavos.padEnd(2, "0").slice(0, 2));
}

// 17500 → "175.00". Volta como texto para o banco gravar o valor exato.
function centavosParaTexto(centavos: number): string {
  return `${Math.trunc(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

// Arredonda para o centavo mais próximo (meio centavo sobe). centavos * percentual é
// inteiro e a divisão por 100 só gera frações exatas (.5, .25...), então o round é seguro.
function calcularComissaoCentavos(valorCentavos: number): number {
  return Math.round((valorCentavos * PERCENTUAL_COMISSAO) / 100);
}

// O "dono" do frete não está na tabela fretes: o motorista vem pela disponibilidade
// usada na proposta, e a empresa pela carga. Todas as rotas partem destes JOINs.
const FROM_FRETES = `
  FROM fretes f
  JOIN propostas p                ON p.id = f.proposta_id
  JOIN chamados_carga c           ON c.id = p.chamado_carga_id
  JOIN chamados_disponibilidade d ON d.id = p.chamado_disp_id`;

const COLUNAS_FRETE = `
  f.id, c.tipo_carga, f.valor_final::float8 AS valor_final, f.status_entrega,
  f.coleta_em, f.entrega_em, f.criado_em, t.status_pagamento`;

// Lista os fretes de quem está logado, mais recentes primeiro. Cada lado vê os dados
// da OUTRA parte: o motorista vê a empresa, a empresa vê o motorista e o veículo.
// status_pagamento é null enquanto a empresa não pagou.
rotasFretes.get("/meus", exigirAutenticacao, exigirTipo("motorista", "empresa"), async (req, res) => {
  if (req.usuario!.tipo === "motorista") {
    const motoristaId = await buscarMotoristaId(req.usuario!.id);
    if (!motoristaId) {
      res.status(404).json({ erro: "perfil de motorista não encontrado" });
      return;
    }
    const { rows } = await pool.query(
      `SELECT ${COLUNAS_FRETE},
              json_build_object('id', e.id, 'razao_social', e.razao_social) AS empresa
       ${FROM_FRETES}
       JOIN empresas e        ON e.id = c.empresa_id
       LEFT JOIN transacoes t ON t.frete_id = f.id
       WHERE d.motorista_id = $1
       ORDER BY f.criado_em DESC`,
      [motoristaId],
    );
    res.json({ fretes: rows });
    return;
  }

  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    res.status(404).json({ erro: "perfil de empresa não encontrado" });
    return;
  }
  const { rows } = await pool.query(
    `SELECT ${COLUNAS_FRETE},
            json_build_object('id', m.id, 'nome_completo', m.nome_completo,
                              'veiculo_tipo', m.veiculo_tipo, 'veiculo_placa', m.veiculo_placa) AS motorista
     ${FROM_FRETES}
     JOIN motoristas m      ON m.id = d.motorista_id
     LEFT JOIN transacoes t ON t.frete_id = f.id
     WHERE c.empresa_id = $1
     ORDER BY f.criado_em DESC`,
    [empresaId],
  );
  res.json({ fretes: rows });
});

// Motorista do frete avança o status da entrega.
rotasFretes.patch("/:id/status", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const id = validarId(req.params.id, "id");
  const status = validarStatusEntrega(req.body);
  if (!id.ok || !status.ok) {
    res.status(400).json({ erros: [...(id.ok ? [] : id.erros), ...(status.ok ? [] : status.erros)] });
    return;
  }
  const novo = status.dados;

  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }

  const resposta = await emTransacao(async (client): Promise<Resposta> => {
    // Trava só a linha do frete (FOR UPDATE OF f): dois PATCH ao mesmo tempo, ou um
    // PATCH junto com o pagamento, passam um de cada vez e o segundo já vê o novo status.
    // Frete de outro motorista cai no mesmo 404 de "não existe".
    const { rows: [frete] } = await client.query(
      `SELECT f.id, f.status_entrega
       ${FROM_FRETES}
       WHERE f.id = $1 AND d.motorista_id = $2
       FOR UPDATE OF f`,
      [id.dados, motoristaId],
    );
    if (!frete) return erro(404, "frete não encontrado");

    if (!transicaoPermitida(frete.status_entrega, novo)) {
      return erro(409, `não é possível mudar o frete de ${frete.status_entrega} para ${novo}`);
    }

    // Os horários vêm do relógio do banco e são gravados só na transição correspondente.
    // O ::status_entrega é obrigatório: sem ele o Postgres deduz que $2 é do ENUM no SET
    // e texto no CASE, e recusa a query (erro 42P08, "inconsistent types").
    const { rows: [atualizado] } = await client.query(
      `UPDATE fretes
          SET status_entrega = $2::status_entrega,
              coleta_em  = CASE WHEN $2::status_entrega = 'em_transito' THEN now() ELSE coleta_em END,
              entrega_em = CASE WHEN $2::status_entrega = 'entregue'    THEN now() ELSE entrega_em END
        WHERE id = $1
        RETURNING id, valor_final::float8 AS valor_final, status_entrega, coleta_em, entrega_em`,
      [frete.id, novo],
    );

    // Entregou: o dinheiro retido é liberado ao motorista na MESMA transação. Se algo
    // falhar daqui até o COMMIT, nem o status nem o pagamento mudam.
    if (novo === "entregue") {
      await client.query(
        `UPDATE transacoes SET status_pagamento = 'liberado', atualizado_em = now()
          WHERE frete_id = $1 AND status_pagamento = 'retido'`,
        [frete.id],
      );
    }

    const { rows: [pagamento] } = await client.query(
      "SELECT status_pagamento FROM transacoes WHERE frete_id = $1",
      [frete.id],
    );
    return {
      status: 200,
      corpo: { frete: { ...atualizado, status_pagamento: pagamento?.status_pagamento ?? null } },
    };
  });

  res.status(resposta.status).json(resposta.corpo);
});

// Empresa dona do frete paga (pagamento SIMULADO: não há gateway, só o registro).
rotasFretes.post("/:id/pagamento", exigirAutenticacao, exigirTipo("empresa"), async (req, res) => {
  const id = validarId(req.params.id, "id");
  if (!id.ok) {
    res.status(400).json({ erros: id.erros });
    return;
  }

  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    res.status(404).json({ erro: "perfil de empresa não encontrado" });
    return;
  }

  const resposta = await emTransacao(async (client): Promise<Resposta> => {
    // Mesma trava do PATCH: o pagamento e a mudança de status nunca se cruzam.
    const { rows: [frete] } = await client.query(
      `SELECT f.id, f.valor_final, f.status_entrega
       ${FROM_FRETES}
       WHERE f.id = $1 AND c.empresa_id = $2
       FOR UPDATE OF f`,
      [id.dados, empresaId],
    );
    if (!frete) return erro(404, "frete não encontrado");
    if (frete.status_entrega === "cancelado") return erro(409, "frete cancelado não pode ser pago");

    // Com o frete travado, um segundo pagamento simultâneo espera aqui e, quando passa,
    // já enxerga a transação do primeiro. O UNIQUE de transacoes.frete_id é a última garantia.
    const jaPago = await client.query("SELECT 1 FROM transacoes WHERE frete_id = $1", [frete.id]);
    if ((jaPago.rowCount ?? 0) > 0) return erro(409, "frete já foi pago");

    const comissao = centavosParaTexto(calcularComissaoCentavos(textoParaCentavos(frete.valor_final)));

    // O dinheiro fica retido até a entrega. Se o frete JÁ foi entregue quando a empresa
    // paga, não há o que esperar: a transação nasce liberada (senão ficaria presa para sempre).
    const statusPagamento = frete.status_entrega === "entregue" ? "liberado" : "retido";

    const { rows } = await client.query(
      `INSERT INTO transacoes (frete_id, valor_frete, percentual_comissao, valor_comissao, status_pagamento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, frete_id, valor_frete::float8 AS valor_frete,
                 percentual_comissao::float8 AS percentual_comissao,
                 valor_comissao::float8 AS valor_comissao, status_pagamento, criado_em`,
      [frete.id, frete.valor_final, PERCENTUAL_COMISSAO.toFixed(2), comissao, statusPagamento],
    );
    return { status: 201, corpo: { transacao: rows[0] } };
  });

  res.status(resposta.status).json(resposta.corpo);
});
