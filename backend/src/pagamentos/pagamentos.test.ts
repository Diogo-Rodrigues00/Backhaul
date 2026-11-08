import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { centavosParaReais, interpretarEventoAsaas, tipoChaveAsaas } from "./asaas";
import { escolherProvedor } from "./index";

describe("centavosParaReais", () => {
  it("converte sem lixo de ponto flutuante", () => {
    assert.equal(centavosParaReais(350010), 3500.1);
    assert.equal(centavosParaReais(9500), 95);
    assert.equal(centavosParaReais(1), 0.01);
  });
});

describe("tipoChaveAsaas", () => {
  it("traduz nossos tipos para os do Asaas", () => {
    assert.equal(tipoChaveAsaas("aleatoria"), "EVP");
    assert.equal(tipoChaveAsaas("telefone"), "PHONE");
    assert.equal(tipoChaveAsaas("cpf"), "CPF");
  });
});

describe("interpretarEventoAsaas", () => {
  it("cobrança paga", () => {
    const ev = interpretarEventoAsaas({
      id: "evt_1",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_1", externalReference: "frete-1" },
    });
    assert.deepEqual(ev, { tipo: "cobranca_paga", eventoId: "evt_1", cobrancaId: "pay_1", referencia: "frete-1" });
  });

  it("repasse concluído e repasse que falhou", () => {
    assert.deepEqual(
      interpretarEventoAsaas({ id: "evt_2", event: "TRANSFER_DONE", transfer: { id: "tr_1" } }),
      { tipo: "repasse_concluido", eventoId: "evt_2", repasseId: "tr_1" },
    );
    assert.deepEqual(
      interpretarEventoAsaas({ id: "evt_3", event: "TRANSFER_FAILED", transfer: { id: "tr_1", failReason: "chave inválida" } }),
      { tipo: "repasse_falhou", eventoId: "evt_3", repasseId: "tr_1", motivo: "chave inválida" },
    );
  });

  it("ignora eventos que não usamos e corpos malformados", () => {
    assert.equal(interpretarEventoAsaas({ id: "evt_4", event: "PAYMENT_CREATED", payment: { id: "pay_1" } }), null);
    assert.equal(interpretarEventoAsaas({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }), null);
    assert.equal(interpretarEventoAsaas({ id: "evt_5", event: "PAYMENT_RECEIVED" }), null);
    assert.equal(interpretarEventoAsaas("lixo"), null);
    assert.equal(interpretarEventoAsaas(null), null);
  });
});

describe("escolherProvedor", () => {
  it("padrão é simulado", () => {
    assert.equal(escolherProvedor({}).nome, "simulado");
  });
  it("sandbox exige a chave", () => {
    assert.throws(() => escolherProvedor({ PAGAMENTOS_MODO: "sandbox" }), /ASAAS_API_KEY/);
    assert.equal(escolherProvedor({ PAGAMENTOS_MODO: "sandbox", ASAAS_API_KEY: "x" }).nome, "asaas");
  });
  it("modo desconhecido falha em vez de cair no gateway", () => {
    assert.throws(() => escolherProvedor({ PAGAMENTOS_MODO: "producao" }), /inválido/);
  });
  it("o simulado repassa na hora com id sim_", async () => {
    const p = escolherProvedor({});
    const r = await p.solicitarRepassePix({ referencia: "f", valorCentavos: 100, chave: "k", tipoChave: "cpf", descricao: "d" });
    assert.equal(r.status, "concluido");
    assert.match(r.repasseId, /^sim_/);
  });
});
