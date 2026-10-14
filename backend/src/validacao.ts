// Validação de FORMATO dos dados que chegam nas rotas.
// Aqui não se consulta o banco: só se responde "isso tem cara de e-mail?",
// "esse CPF tem 11 dígitos?". Se algo falhar, a rota devolve 400.

// Resultado padrão: ou deu certo e vêm os dados já limpos,
// ou deu errado e vem a lista de problemas para mostrar ao cliente.
export type Resultado<T> = { ok: true; dados: T } | { ok: false; erros: string[] };

export type DadosMotorista = {
  email: string;
  senha: string;
  nome_completo: string;
  cpf: string;
  cnh: string;
  veiculo_tipo: string;
  veiculo_placa: string;
  capacidade_kg: number;
};

export type DadosEmpresa = {
  email: string;
  senha: string;
  razao_social: string;
  cnpj: string;
};

export type DadosLogin = { email: string; senha: string };

const SENHA_MINIMO = 8;

// Formato simples: algo@algo.algo, sem espaços. Não tenta cobrir a RFC inteira.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Só aceita dígitos e a pontuação comum de documentos (. - / espaço).
// Assim "123.456.789-01" passa, mas "abc12345678901" não.
const REGEX_DOCUMENTO = /^[\d.\-\/\s]+$/;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

// E-mail sempre minúsculo: o UNIQUE do Postgres diferencia maiúsculas.
function validarEmail(valor: unknown, erros: string[]): string {
  const email = texto(valor).toLowerCase();
  if (!REGEX_EMAIL.test(email)) erros.push("email inválido");
  return email;
}

// A senha NÃO passa por trim: espaço no começo/fim pode ser intencional.
function validarSenha(valor: unknown, erros: string[]): string {
  const senha = typeof valor === "string" ? valor : "";
  if (senha.length < SENHA_MINIMO) {
    erros.push(`senha deve ter no mínimo ${SENHA_MINIMO} caracteres`);
  }
  return senha;
}

// Remove a pontuação e confere a quantidade de dígitos (11 para CPF, 14 para CNPJ).
function validarDocumento(valor: unknown, nome: string, digitos: number, erros: string[]): string {
  const bruto = texto(valor);
  const limpo = bruto.replace(/\D/g, "");
  if (!REGEX_DOCUMENTO.test(bruto) || limpo.length !== digitos) {
    erros.push(`${nome} deve ter ${digitos} dígitos`);
  }
  return limpo;
}

function obrigatorio(valor: unknown, nome: string, erros: string[]): string {
  const t = texto(valor);
  if (!t) erros.push(`${nome} é obrigatório`);
  return t;
}

function corpo(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

export function validarCadastroMotorista(body: unknown): Resultado<DadosMotorista> {
  const b = corpo(body);
  const erros: string[] = [];

  const capacidade = Number(b.capacidade_kg);
  if (!Number.isFinite(capacidade) || capacidade <= 0) {
    erros.push("capacidade_kg deve ser um número maior que zero");
  }

  const dados: DadosMotorista = {
    email: validarEmail(b.email, erros),
    senha: validarSenha(b.senha, erros),
    nome_completo: obrigatorio(b.nome_completo, "nome_completo", erros),
    cpf: validarDocumento(b.cpf, "cpf", 11, erros),
    cnh: obrigatorio(b.cnh, "cnh", erros),
    veiculo_tipo: obrigatorio(b.veiculo_tipo, "veiculo_tipo", erros),
    veiculo_placa: obrigatorio(b.veiculo_placa, "veiculo_placa", erros).toUpperCase(),
    capacidade_kg: capacidade,
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

export function validarCadastroEmpresa(body: unknown): Resultado<DadosEmpresa> {
  const b = corpo(body);
  const erros: string[] = [];

  const dados: DadosEmpresa = {
    email: validarEmail(b.email, erros),
    senha: validarSenha(b.senha, erros),
    razao_social: obrigatorio(b.razao_social, "razao_social", erros),
    cnpj: validarDocumento(b.cnpj, "cnpj", 14, erros),
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

// No login só checamos que os campos vieram. Regras de tamanho de senha
// aqui só dariam pistas a quem está tentando adivinhar contas.
export function validarLogin(body: unknown): Resultado<DadosLogin> {
  const b = corpo(body);
  const email = texto(b.email).toLowerCase();
  const senha = typeof b.senha === "string" ? b.senha : "";
  if (!email || !senha) return { ok: false, erros: ["email e senha são obrigatórios"] };
  return { ok: true, dados: { email, senha } };
}
