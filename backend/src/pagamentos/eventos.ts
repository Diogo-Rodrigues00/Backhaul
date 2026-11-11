import type { PoolClient } from "pg";
import type { EventoPagamento } from "./tipos";

// ============================================================================
//  PARA O DIOGO ESCREVER
// ============================================================================
// O Asaas pode mandar o MESMO webhook mais de uma vez (reenvio quando a nossa API
// demora ou responde erro). Sem proteção, o mesmo "pagamento recebido" seria
// aplicado duas vezes. A tabela eventos_pagamento tem UNIQUE (gateway, evento_id)
// justamente para isso: o banco recusa o segundo registro do mesmo evento.
//
// Esta função registra o evento e responde:
//   true  = evento NOVO (primeira vez): quem chamou deve aplicá-lo
//   false = evento JÁ registrado antes: quem chamou deve ignorá-lo
//
// Dicas (o porquê, antes do como):
//  - Não faça SELECT para ver se existe e depois INSERT: entre os dois, outro webhook
//    igual pode entrar (condição de corrida). Deixe o PRÓPRIO banco decidir, com um
//    único comando: INSERT ... ON CONFLICT (gateway, evento_id) DO NOTHING.
//  - rowCount do resultado diz se a linha entrou (1) ou foi descartada (0).
//  - Use o `client` recebido (é o da transação do webhook), não o pool: se algo
//    falhar depois, o registro do evento também volta atrás (ROLLBACK).
//  - Colunas: gateway, evento_id, tipo, payload (JSONB). Passe o payload com
//    JSON.stringify(payload) e use $4::jsonb no SQL.
//  - O teste está em eventos.test.ts: rode `npm test` até ele passar.
// ============================================================================
export async function registrarEvento(
  _client: PoolClient,
  _gateway: string,
  _evento: EventoPagamento,
  _payload: unknown,
): Promise<boolean> {
  throw new Error("registrarEvento ainda não foi implementado (tarefa do Diogo)");
}
