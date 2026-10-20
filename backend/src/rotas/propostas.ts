import { Router } from "express";
import type { PoolClient } from "pg";
import { emTransacao } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarEmpresaId, buscarMotoristaId } from "../perfis";
import { validarId, validarProposta, validarRespostaProposta } from "../validacao";

export const rotasPropostas = Router();

// As decisões (404, 409...) são tomadas DENTRO da transação, depois de travar a carga.
// Em vez de responder lá de dentro, a transação devolve status + corpo e a rota responde
// depois do COMMIT. Assim nunca se responde 201/200 de algo que ainda pode dar ROLLBACK.
type Resposta = { status: number; corpo: object };

function erro(status: number, mensagem: string): Resposta {
  return { status, corpo: { erro: mensagem } };
}

// Trava a linha da carga até o fim da transação (COMMIT ou ROLLBACK).
// Quem chegar depois para a MESMA carga espera aqui, e quando passa já enxerga
// o que a transação anterior gravou (ex.: status 'fechado').
// "vigente" já vem calculado pelo relógio do banco, o mesmo usado no GET /cargas/proximas.
async function travarCarga(client: PoolClient, cargaId: string) {
  const { rows } = await client.query(
    `SELECT id, status, valor_oferecido, expira_em > now() AS vigente
       FROM chamados_carga
      WHERE id = $1
      FOR UPDATE`,
    [cargaId],
  );
  return rows[0] as { id: string; status: string; valor_oferecido: string; vigente: boolean } | undefined;
}

// Regra da contraproposta única: cada motorista só pode fazer UMA contraproposta por carga.
// Roda com a carga já travada, então duas contrapropostas simultâneas do mesmo motorista
// não passam as duas por esta checagem.
async function jaFezContraproposta(
  client: PoolClient,
  cargaId: string,
  motoristaId: string,
): Promise<boolean> {
  const r = await client.query(
    `SELECT 1
       FROM propostas p
       JOIN chamados_disponibilidade d ON d.id = p.chamado_disp_id
      WHERE p.chamado_carga_id = $1
        AND d.motorista_id = $2
        AND p.tipo = 'contraproposta'
      LIMIT 1`,
    [cargaId, motoristaId],
  );
  return (r.rowCount ?? 0) > 0;
}

// Motorista faz uma proposta para uma carga, usando uma disponibilidade dele.
rotasPropostas.post("/", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const validacao = validarProposta(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;

  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }

  const resposta = await emTransacao(async (client): Promise<Resposta> => {
    // A disponibilidade tem que ser do motorista logado. Se for de outro, a resposta
    // é a mesma de "não existe": não confirmamos que aquele id existe.
    const disp = await client.query(
      "SELECT 1 FROM chamados_disponibilidade WHERE id = $1 AND motorista_id = $2",
      [d.chamado_disp_id, motoristaId],
    );
    if (disp.rowCount === 0) return erro(404, "disponibilidade não encontrada");

    const carga = await travarCarga(client, d.chamado_carga_id);
    if (!carga) return erro(404, "carga não encontrada");
    if (carga.status !== "aberto" || !carga.vigente) {
      return erro(409, "carga não está mais aberta para propostas");
    }

    if (d.tipo === "contraproposta" && (await jaFezContraproposta(client, carga.id, motoristaId))) {
      return erro(409, "você já fez a contraproposta única para esta carga");
    }

    // No aceite o valor é o da carga. Ele vem do banco como texto ("3500.00") e volta
    // para o banco do mesmo jeito, sem passar por float e sem perder centavos.
    const valor = d.tipo === "aceite" ? carga.valor_oferecido : d.valor_proposto;

    const { rows } = await client.query(
      `INSERT INTO propostas (chamado_disp_id, chamado_carga_id, tipo, valor_proposto)
       VALUES ($1, $2, $3, $4)
       RETURNING id, chamado_carga_id, chamado_disp_id, tipo,
                 valor_proposto::float8 AS valor_proposto, status, criado_em`,
      [d.chamado_disp_id, carga.id, d.tipo, valor],
    );
    return { status: 201, corpo: { proposta: rows[0] } };
  });

  res.status(resposta.status).json(resposta.corpo);
});

// Empresa dona da carga aceita ou recusa uma proposta.
rotasPropostas.post("/:id/responder", exigirAutenticacao, exigirTipo("empresa"), async (req, res) => {
  const id = validarId(req.params.id, "id");
  const acao = validarRespostaProposta(req.body);
  if (!id.ok || !acao.ok) {
    res.status(400).json({ erros: [...(id.ok ? [] : id.erros), ...(acao.ok ? [] : acao.erros)] });
    return;
  }

  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    res.status(404).json({ erro: "perfil de empresa não encontrado" });
    return;
  }

  const resposta = await emTransacao(async (client): Promise<Resposta> => {
    // 1) Descobre a carga da proposta, já conferindo que é desta empresa.
    //    Proposta de carga de outra empresa responde 404, igual a "não existe".
    const dona = await client.query(
      `SELECT p.chamado_carga_id
         FROM propostas p
         JOIN chamados_carga c ON c.id = p.chamado_carga_id
        WHERE p.id = $1 AND c.empresa_id = $2`,
      [id.dados, empresaId],
    );
    if (dona.rowCount === 0) return erro(404, "proposta não encontrada");

    // 2) Trava a carga. Duas aceitações ao mesmo tempo param aqui: a segunda só
    //    continua depois do COMMIT da primeira.
    const carga = (await travarCarga(client, dona.rows[0].chamado_carga_id))!;

    // 3) Lê a proposta DEPOIS da trava. No READ COMMITTED cada comando enxerga o que
    //    já foi confirmado até ele começar, então aqui o status já está atualizado.
    const { rows: [proposta] } = await client.query(
      "SELECT id, status, valor_proposto FROM propostas WHERE id = $1",
      [id.dados],
    );
    if (proposta.status !== "pendente") return erro(409, `proposta já está ${proposta.status}`);

    if (acao.dados === "recusar") {
      const { rows } = await client.query(
        "UPDATE propostas SET status = 'recusada' WHERE id = $1 RETURNING id, status",
        [proposta.id],
      );
      return { status: 200, corpo: { proposta: rows[0] } };
    }

    if (carga.status !== "aberto" || !carga.vigente) {
      return erro(409, "carga não está mais aberta");
    }

    await client.query("UPDATE propostas SET status = 'aceita' WHERE id = $1", [proposta.id]);
    await client.query(
      `UPDATE propostas SET status = 'recusada'
        WHERE chamado_carga_id = $1 AND id <> $2 AND status = 'pendente'`,
      [carga.id, proposta.id],
    );
    await client.query("UPDATE chamados_carga SET status = 'fechado' WHERE id = $1", [carga.id]);

    // status_entrega tem DEFAULT 'aceito', mas fica explícito porque é a regra de negócio.
    const { rows } = await client.query(
      `INSERT INTO fretes (proposta_id, valor_final, status_entrega)
       VALUES ($1, $2, 'aceito')
       RETURNING id, proposta_id, valor_final::float8 AS valor_final, status_entrega, criado_em`,
      [proposta.id, proposta.valor_proposto],
    );
    return { status: 200, corpo: { frete: rows[0] } };
  });

  res.status(resposta.status).json(resposta.corpo);
});
