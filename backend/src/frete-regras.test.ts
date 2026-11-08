import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularComissaoCentavos,
  calcularRepasseCentavos,
  centavosParaTexto,
  textoParaCentavos,
  transicaoPermitida,
} from "./frete-regras";

describe("textoParaCentavos / centavosParaTexto", () => {
  it("converte sem erro de ponto flutuante", () => {
    assert.equal(textoParaCentavos("3500.00"), 350000);
    assert.equal(textoParaCentavos("3500.10"), 350010);
    assert.equal(textoParaCentavos("0.10"), 10);
    assert.equal(textoParaCentavos("12"), 1200);
  });
  it("volta para texto com duas casas", () => {
    assert.equal(centavosParaTexto(17500), "175.00");
    assert.equal(centavosParaTexto(5), "0.05");
    assert.equal(centavosParaTexto(17501), "175.01");
  });
});

describe("calcularComissaoCentavos (5%)", () => {
  it("calcula o caso redondo", () => assert.equal(calcularComissaoCentavos(350000), 17500));
  it("3500.10 vira 175.01 (meio centavo sobe)", () => {
    assert.equal(centavosParaTexto(calcularComissaoCentavos(textoParaCentavos("3500.10"))), "175.01");
  });
  it("arredonda para baixo abaixo do meio centavo", () => assert.equal(calcularComissaoCentavos(1009), 50));
  it("valor zero tem comissão zero", () => assert.equal(calcularComissaoCentavos(0), 0));
});

describe("transicaoPermitida", () => {
  it("só avança na ordem aceito → em_transito → entregue", () => {
    assert.equal(transicaoPermitida("aceito", "em_transito"), true);
    assert.equal(transicaoPermitida("em_transito", "entregue"), true);
  });
  it("não pula etapa nem volta", () => {
    assert.equal(transicaoPermitida("aceito", "entregue"), false);
    assert.equal(transicaoPermitida("em_transito", "aceito"), false);
    assert.equal(transicaoPermitida("entregue", "em_transito"), false);
  });
  it("entregue e cancelado são o fim da linha", () => {
    assert.equal(transicaoPermitida("entregue", "cancelado"), false);
    assert.equal(transicaoPermitida("cancelado", "aceito"), false);
  });
});

describe("calcularRepasseCentavos", () => {
  it("é o valor do frete menos a comissão", () => {
    assert.equal(calcularRepasseCentavos(350000), 332500);
    assert.equal(centavosParaTexto(calcularRepasseCentavos(textoParaCentavos("3500.10"))), "3325.09");
  });
  it("comissão + repasse sempre somam o valor do frete", () => {
    for (const valor of [0, 1, 9, 10, 99, 1009, 350010, 9999999999]) {
      assert.equal(calcularComissaoCentavos(valor) + calcularRepasseCentavos(valor), valor);
    }
  });
});
