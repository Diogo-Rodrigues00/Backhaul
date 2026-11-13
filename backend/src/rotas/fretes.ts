import { Router } from "express";
import { emTransacao, pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarEmpresaId, buscarMotoristaId } from "../perfis";
import {
  PERCENTUAL_COMISSAO,
  calcularComissaoCentavos,
  calcularRepasseCentavos,
  centavosParaTexto,
  textoParaCentavos,
  transicaoPermitida,
} from "../frete-regras";
import { validarId, validarStatusEntrega, type TipoChavePix } from "../validacao";
import { ErroGateway } from "../pagamentos/asaas";
import { escolherProvedor } from "../pagamentos";

export const rotasFretes = Router();

// Provedor escolhido pelo ambiente (PAGAMENTOS_MODO). Criado UMA vez ao carregar o módulo:
// configuração errada derruba a API na subida, não no meio de um pagamento.
const provedor = escolherProvedor();
const GATEWAY_REAL = provedor.nome !== "simulado";

// Mesmo padrão do propostas.ts: a transação devolve status + corpo e a rota só
// responde depois do COMMIT.
type Resposta = { status: number; corpo: object };

// `codigo` é um texto ESTÁVEL para o front reconhecer o erro sem depender da frase.
function erro(status: number, mensagem: string, codigo?: string): Resposta {
  return { status, corpo: codigo ? { erro: mensagem, codigo } : { erro: mensagem } };
}

// Se o gateway falhar, a transação já voltou atrás; aqui viramos 502 (o problema está no
// serviço de fora, não no pedido do cliente) sem expor o texto do erro.
async function comTratamentoDeGateway(executar: () => Promise<Resposta>): Promise<Resposta> {
  try {
    return await executar();
  } catch (e) {
    if (e instanceof ErroGateway) {
      console.error(e.message);
      return erro(502, "serviço de pagamento indisponível, tente novamente", "gateway_indisponivel");
    }
    throw e;
  }
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
            CASE WHEN t.status_pagamento = 'pendente' THEN t.pix_copia_cola END AS pix_copia_cola,
            CASE WHEN t.status_pagamento = 'pendente' THEN t.expira_em END AS pix_expira_em,
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

  const resposta = await comTratamentoDeGateway(() => emTransacao(async (client): Promise<Resposta> => {
    // Trava só a linha do frete (FOR UPDATE OF f): dois PATCH ao mesmo tempo, ou um
    // PATCH junto com o pagamento, passam um de cada vez e o segundo já vê o novo status.
    // Frete de outro motorista cai no mesmo 404 de "não existe".
    const { rows: [frete] } = await client.query(
      `SELECT f.id, f.status_entrega, f.valor_final
       ${FROM_FRETES}
       WHERE f.id = $1 AND d.motorista_id = $2
       FOR UPDATE OF f`,
      [id.dados, motoristaId],
    );
    if (!frete) return erro(404, "frete não encontrado");

    if (!transicaoPermitida(frete.status_entrega, novo)) {
      return erro(409, `não é possível mudar o frete de ${frete.status_entrega} para ${novo}`);
    }

    if (GATEWAY_REAL) {
      const { rows: [t] } = await client.query(
        "SELECT id, status_pagamento, repasse_referencia FROM transacoes WHERE frete_id = $1",
        [frete.id],
      );
      // Com pagamento real, o frete só sai da origem com o dinheiro JÁ retido pela plataforma.
      if (novo === "em_transito" && t?.status_pagamento !== "retido") {
        return erro(409, "aguardando a confirmação do pagamento da empresa", "pagamento_nao_confirmado");
      }
      if (novo === "entregue") {
        if (t?.status_pagamento !== "retido") return erro(409, "o pagamento deste frete não está retido", "pagamento_nao_retido");
        // Já pediu o repasse antes (ex.: tentativa anterior) e ele não falhou: não pede de novo.
        if (!t.repasse_referencia) {
          const { rows: [m] } = await client.query(
            "SELECT tipo_chave_pix, chave_pix FROM motoristas WHERE id = $1",
            [motoristaId],
          );
          if (!m?.chave_pix) return erro(409, "cadastre sua chave Pix antes de concluir a entrega", "chave_pix_ausente");
          // Pede o repasse ao gateway DENTRO da transação: se o gateway recusar, o frete
          // continua em_transito e o motorista pode tentar de novo.
          const repasse = await provedor.solicitarRepassePix({
            referencia: frete.id,
            valorCentavos: calcularRepasseCentavos(textoParaCentavos(frete.valor_final)),
            chave: m.chave_pix,
            tipoChave: m.tipo_chave_pix as TipoChavePix,
            descricao: "Repasse de frete Backhaul",
          });
          await client.query(
            "UPDATE transacoes SET repasse_referencia = $2, atualizado_em = now() WHERE id = $1",
            [t.id, repasse.repasseId],
          );
        }
      }
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
    // Com gateway real NÃO liberamos aqui: quem libera é o webhook TRANSFER_DONE.
    if (novo === "entregue" && !GATEWAY_REAL) {
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
  }));

  res.status(resposta.status).json(resposta.corpo);
});

// Empresa dona do frete paga.
// Modo simulado (padrão): só grava a transação como "retido".
// Modo gateway: gera a cobrança Pix; a transação nasce "pendente" e o webhook a muda para
// "retido" quando o Pix for pago.
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

  const resposta = await comTratamentoDeGateway(() => emTransacao(async (client): Promise<Resposta> => {
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
    const { rows: [existente] } = await client.query(
      "SELECT status_pagamento, gateway, gateway_referencia FROM transacoes WHERE frete_id = $1",
      [frete.id],
    );
    if (existente) {
      // Pedir de novo enquanto o Pix está pendente devolve a MESMA cobrança (idempotente):
      // é o que a empresa precisa se recarregar a página e perder o QR Code.
      if (GATEWAY_REAL && existente.status_pagamento === "pendente" && existente.gateway_referencia) {
        const qr = await provedor.consultarCobrancaPix(existente.gateway_referencia);
        const { rows: [t] } = await client.query(
          `SELECT id, frete_id, valor_frete::float8 AS valor_frete,
                  percentual_comissao::float8 AS percentual_comissao,
                  valor_comissao::float8 AS valor_comissao, status_pagamento, criado_em
             FROM transacoes WHERE frete_id = $1`,
          [frete.id],
        );
        return {
          status: 200,
          corpo: { transacao: t, pix: { copia_e_cola: qr.copiaECola, qr_code_base64: qr.qrCodeBase64, expira_em: qr.expiraEm } },
        };
      }
      return erro(409, "frete já foi pago", "frete_ja_pago");
    }

    const comissao = centavosParaTexto(calcularComissaoCentavos(textoParaCentavos(frete.valor_final)));

    if (GATEWAY_REAL) {
      // Pagar um frete já entregue não tem como "reter e repassar": fica fora do fluxo real.
      if (frete.status_entrega === "entregue") return erro(409, "frete já entregue não pode ser pago", "frete_entregue");

      const { rows: [empresa] } = await client.query(
        "SELECT razao_social, cnpj FROM empresas WHERE id = $1",
        [empresaId],
      );
      const venceEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      // Chamada de rede dentro da transação: se o gateway falhar, nada é gravado.
      const cobranca = await provedor.criarCobrancaPix({
        referencia: frete.id,
        valorCentavos: textoParaCentavos(frete.valor_final),
        descricao: "Frete Backhaul",
        pagador: { nome: empresa.razao_social, cpfCnpj: empresa.cnpj },
        venceEm,
      });
      const { rows } = await client.query(
        `INSERT INTO transacoes
           (frete_id, valor_frete, percentual_comissao, valor_comissao, status_pagamento,
            gateway, gateway_referencia, pix_copia_cola, expira_em)
         VALUES ($1, $2, $3, $4, 'pendente', $5, $6, $7, $8)
         RETURNING id, frete_id, valor_frete::float8 AS valor_frete,
                   percentual_comissao::float8 AS percentual_comissao,
                   valor_comissao::float8 AS valor_comissao, status_pagamento, criado_em`,
        [frete.id, frete.valor_final, PERCENTUAL_COMISSAO.toFixed(2), comissao,
         provedor.nome, cobranca.cobrancaId, cobranca.copiaECola, cobranca.expiraEm],
      );
      return {
        status: 201,
        corpo: {
          transacao: rows[0],
          pix: { copia_e_cola: cobranca.copiaECola, qr_code_base64: cobranca.qrCodeBase64, expira_em: cobranca.expiraEm },
        },
      };
    }

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
  }));

  res.status(resposta.status).json(resposta.corpo);
});
