import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { PoolClient } from "pg";
import { emTransacao } from "../db";
import { interpretarEventoAsaas } from "../pagamentos/asaas";
import { registrarEvento } from "../pagamentos/eventos";
import type { EventoPagamento } from "../pagamentos/tipos";

export const rotasWebhooks = Router();

// Erro "tente de novo": faz a transação voltar atrás (inclusive o registro do evento)
// e a rota responder 503. O Asaas reenvia o webhook mais tarde.
class ErroTentarDepois extends Error {}

// Compara o token em tempo constante: comparar com === vaza, pelo tempo de resposta,
// quantos caracteres do início estavam certos.
function tokenConfere(recebido: unknown, esperado: string): boolean {
  if (typeof recebido !== "string") return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Aplica o evento já registrado. Só mexe em transações NOSSAS (gateway = 'asaas').
async function aplicarEvento(client: PoolClient, evento: EventoPagamento): Promise<"aplicado" | "ignorado"> {
  if (evento.tipo === "cobranca_paga") {
    // Cobrança desconhecida (ex.: teste feito direto no painel) não é erro nosso:
    // responder erro faria o Asaas reenviar para sempre e pausar a fila de webhooks.
    const r = await client.query(
      `UPDATE transacoes
          SET status_pagamento = 'retido', pago_em = now(), atualizado_em = now()
        WHERE gateway = 'asaas' AND gateway_referencia = $1 AND status_pagamento = 'pendente'`,
      [evento.cobrancaId],
    );
    return (r.rowCount ?? 0) > 0 ? "aplicado" : "ignorado";
  }

  // Eventos do repasse: a referência foi gravada pela nossa rota de entrega. Se o
  // webhook chegar ANTES dela ser confirmada no banco, ainda não achamos a linha:
  // pedimos reenvio (503) em vez de perder o aviso.
  const existe = await client.query("SELECT 1 FROM transacoes WHERE repasse_referencia = $1", [evento.repasseId]);
  if (evento.tipo === "repasse_concluido") {
    const r = await client.query(
      `UPDATE transacoes
          SET status_pagamento = 'liberado', repassado_em = now(), atualizado_em = now()
        WHERE repasse_referencia = $1 AND status_pagamento = 'retido'`,
      [evento.repasseId],
    );
    if ((r.rowCount ?? 0) > 0) return "aplicado";
    if ((existe.rowCount ?? 0) === 0) throw new ErroTentarDepois();
    return "ignorado"; // já estava liberado
  }

  // repasse_falhou: o dinheiro continua retido; limpar a referência permite pedir de novo.
  console.error(`webhook: repasse ${evento.repasseId} falhou (${evento.motivo ?? "sem motivo"})`);
  const r = await client.query(
    `UPDATE transacoes SET repasse_referencia = NULL, atualizado_em = now()
      WHERE repasse_referencia = $1 AND status_pagamento = 'retido'`,
    [evento.repasseId],
  );
  if ((r.rowCount ?? 0) === 0 && (existe.rowCount ?? 0) === 0) throw new ErroTentarDepois();
  return (r.rowCount ?? 0) > 0 ? "aplicado" : "ignorado";
}

// Webhook do Asaas. Autenticado por token (header asaas-access-token) e idempotente.
rotasWebhooks.post("/asaas", async (req, res) => {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado) {
    res.status(503).json({ erro: "webhook não configurado" });
    return;
  }
  if (!tokenConfere(req.header("asaas-access-token"), esperado)) {
    res.status(401).json({ erro: "token inválido" });
    return;
  }

  // Evento que não usamos: 200 mesmo assim, senão o Asaas ficaria reenviando.
  const evento = interpretarEventoAsaas(req.body);
  if (!evento) {
    res.status(200).json({ resultado: "ignorado" });
    return;
  }

  try {
    const resultado = await emTransacao(async (client) => {
      // Registro e aplicação na MESMA transação: se aplicar falhar, o registro volta atrás
      // e o reenvio do Asaas será tratado como evento novo.
      const novo = await registrarEvento(client, "asaas", evento, req.body);
      if (!novo) return "duplicado";
      return aplicarEvento(client, evento);
    });
    res.status(200).json({ resultado });
  } catch (erro) {
    if (erro instanceof ErroTentarDepois) {
      res.status(503).json({ erro: "transação ainda não encontrada, tente novamente" });
      return;
    }
    throw erro;
  }
});
