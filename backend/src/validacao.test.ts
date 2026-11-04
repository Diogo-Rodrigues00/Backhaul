import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cnpjValido, cpfValido, normalizarPlaca, validarCadastroEmpresa, validarCadastroMotorista } from "./validacao";

describe("cpfValido", () => {
  it("aceita um CPF com dígitos verificadores corretos", () => assert.equal(cpfValido("52998224725"), true));
  it("recusa dígito verificador errado", () => assert.equal(cpfValido("52998224724"), false));
  it("recusa sequência repetida", () => assert.equal(cpfValido("11111111111"), false));
  it("recusa tamanho errado e letras", () => {
    assert.equal(cpfValido("5299822472"), false);
    assert.equal(cpfValido("5299822472a"), false);
  });
});

describe("cnpjValido", () => {
  it("aceita um CNPJ com dígitos verificadores corretos", () => assert.equal(cnpjValido("11222333000181"), true));
  it("recusa dígito verificador errado", () => assert.equal(cnpjValido("11222333000182"), false));
  it("recusa sequência repetida", () => assert.equal(cnpjValido("00000000000000"), false));
});

describe("normalizarPlaca", () => {
  it("tira hífen e espaço e põe em maiúsculas", () => {
    assert.equal(normalizarPlaca("abc-1d23"), "ABC1D23");
    assert.equal(normalizarPlaca(" abc 1234 "), "ABC1234");
  });
});

const motorista = {
  email: "joao@exemplo.com", senha: "senha1234", nome_completo: "João da Silva",
  cpf: "529.982.247-25", cnh: "11122233344", veiculo_tipo: "carreta", veiculo_placa: "abc-1d23", capacidade_kg: 15000,
};

describe("validarCadastroMotorista", () => {
  it("aceita dados válidos e normaliza CPF e placa", () => {
    const r = validarCadastroMotorista(motorista);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.dados.cpf, "52998224725");
      assert.equal(r.dados.veiculo_placa, "ABC1D23");
    }
  });
  it("recusa CPF inválido e placa inválida", () => {
    const r = validarCadastroMotorista({ ...motorista, cpf: "123.456.789-01", veiculo_placa: "XXXX" });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.erros.includes("cpf inválido"));
      assert.ok(r.erros.some((e) => e.startsWith("veiculo_placa inválida")));
    }
  });
});

describe("validarCadastroEmpresa", () => {
  const empresa = { email: "contato@empresa.com", senha: "senha1234", razao_social: "Empresa LTDA", cnpj: "11.222.333/0001-81" };
  it("aceita CNPJ válido", () => assert.equal(validarCadastroEmpresa(empresa).ok, true));
  it("recusa CNPJ inválido", () => {
    const r = validarCadastroEmpresa({ ...empresa, cnpj: "12.345.678/0001-99" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.erros.includes("cnpj inválido"));
  });
});
