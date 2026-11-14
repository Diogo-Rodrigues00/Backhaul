import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PoolClient } from "pg";
import { registrarEvento } from "./eventos";
import type { EventoPagamento } from "./tipos";

// Cliente de mentira: guarda a query recebida e devolve o rowCount combinado.
function clienteFalso(rowCount: number) {
  const chamadas: { sql: string; params: unknown[] }[] = [];
  const client = {
    query: async (sql: string, params: unknown[] = []) => {
      chamadas.push({ sql, params });
      return { rowCount, rows: [] };
    },
  } as unknown as PoolClient;
  return { client, chamadas };
}

const evento: EventoPagamento = { tipo: "cobranca_paga", eventoId: "evt_1", cobrancaId: "pay_1", referencia: null };
const payload = { id: "evt_1", event: "PAYMENT_RECEIVED" };

describe("registrarEvento", () => {
  it("evento novo: devolve true", async () => {
    const { client } = clienteFalso(1);
    assert.equal(await registrarEvento(client, "asaas", evento, payload), true);
  });

  it("evento repetido: devolve false", async () => {
    const { client } = clienteFalso(0);
    assert.equal(await registrarEvento(client, "asaas", evento, payload), false);
  });

  it("deixa o banco decidir com UM comando (INSERT ... ON CONFLICT)", async () => {
    const { client, chamadas } = clienteFalso(1);
    await registrarEvento(client, "asaas", evento, payload);
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0].sql, /INSERT INTO eventos_pagamento/i);
    assert.match(chamadas[0].sql, /ON CONFLICT/i);
  });

  it("grava gateway, id, tipo e o payload como JSON", async () => {
    const { client, chamadas } = clienteFalso(1);
    await registrarEvento(client, "asaas", evento, payload);
    const p = chamadas[0].params;
    assert.equal(p[0], "asaas");
    assert.equal(p[1], "evt_1");
    assert.equal(p[2], "cobranca_paga");
    assert.deepEqual(JSON.parse(p[3] as string), payload);
  });
});
