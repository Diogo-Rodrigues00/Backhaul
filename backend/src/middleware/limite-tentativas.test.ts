import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarContador } from "./limite-tentativas";

describe("criarContador", () => {
  it("deixa passar até o máximo e bloqueia a tentativa seguinte", () => {
    const registrar = criarContador({ janelaMs: 1000, maximo: 3, agora: () => 0 });
    assert.equal(registrar("1.1.1.1").permitido, true);
    assert.equal(registrar("1.1.1.1").permitido, true);
    assert.equal(registrar("1.1.1.1").permitido, true);
    assert.equal(registrar("1.1.1.1").permitido, false);
  });

  it("informa quanto falta para a janela acabar (arredondado para cima)", () => {
    let t = 0;
    const registrar = criarContador({ janelaMs: 10_000, maximo: 1, agora: () => t });
    registrar("a");
    t = 2_500;
    const v = registrar("a");
    assert.deepEqual(v, { permitido: false, esperarSegundos: 8 });
  });

  it("cada IP tem a sua própria conta", () => {
    const registrar = criarContador({ janelaMs: 1000, maximo: 1, agora: () => 0 });
    registrar("a");
    assert.equal(registrar("a").permitido, false);
    assert.equal(registrar("b").permitido, true);
  });

  it("libera de novo quando a janela expira", () => {
    let t = 0;
    const registrar = criarContador({ janelaMs: 1000, maximo: 1, agora: () => t });
    registrar("a");
    assert.equal(registrar("a").permitido, false);
    t = 1000;
    assert.equal(registrar("a").permitido, true);
  });
});
