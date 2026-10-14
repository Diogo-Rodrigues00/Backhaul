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

export type Ponto = { lat: number; lng: number };

export type Urgencia = "normal" | "urgente" | "critico";

export type DadosCarga = {
  tipo_carga: string;
  origem: Ponto;
  destino: Ponto;
  peso_kg: number;
  valor_oferecido: number;
  urgencia: Urgencia;
  certificacao_requerida_id: string | null;
  expira_em: Date;
};

const SENHA_MINIMO = 8;

// Formato simples: algo@algo.algo, sem espaços. Não tenta cobrir a RFC inteira.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Só aceita dígitos e a pontuação comum de documentos (. - / espaço).
// Assim "123.456.789-01" passa, mas "abc12345678901" não.
const REGEX_DOCUMENTO = /^[\d.\-\/\s]+$/;

// Formato de UUID (8-4-4-4-12 caracteres hexadecimais). Sem essa checagem, um id
// mal formatado chegaria no Postgres e daria erro 22P02, que viraria 500.
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mesmos valores do ENUM nivel_urgencia do schema.sql.
const URGENCIAS: readonly Urgencia[] = ["normal", "urgente", "critico"];

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

// Só aceita number de verdade: Number("") e Number(null) dão 0 e Number(true) dá 1,
// o que faria lixo passar como coordenada válida.
function numeroPositivo(valor: unknown, nome: string, erros: string[]): number {
  const n = typeof valor === "number" ? valor : NaN;
  if (!Number.isFinite(n) || n <= 0) erros.push(`${nome} deve ser um número maior que zero`);
  return n;
}

// Espera { lat, lng }. Latitude vai de -90 (polo sul) a 90 (polo norte);
// longitude de -180 a 180 (a partir do meridiano de Greenwich).
function validarPonto(valor: unknown, nome: string, erros: string[]): Ponto {
  const p = corpo(valor);
  const lat = typeof p.lat === "number" ? p.lat : NaN;
  const lng = typeof p.lng === "number" ? p.lng : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    erros.push(`${nome}.lat deve ser um número entre -90 e 90`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    erros.push(`${nome}.lng deve ser um número entre -180 e 180`);
  }
  return { lat, lng };
}

// Campo opcional: se não vier, a urgência fica "normal" (mesmo DEFAULT do banco).
function validarUrgencia(valor: unknown, erros: string[]): Urgencia {
  if (valor === undefined || valor === null) return "normal";
  if (!URGENCIAS.includes(valor as Urgencia)) {
    erros.push(`urgencia deve ser ${URGENCIAS.join(", ")}`);
  }
  return valor as Urgencia;
}

// Opcional: ausente ou null quer dizer "qualquer motorista pode pegar".
// Aqui só se confere o FORMATO; se o id existe, quem responde é o banco (erro 23503).
function validarUuidOpcional(valor: unknown, nome: string, erros: string[]): string | null {
  if (valor === undefined || valor === null) return null;
  const t = texto(valor);
  if (!REGEX_UUID.test(t)) erros.push(`${nome} deve ser um UUID válido`);
  return t;
}

// Data em ISO 8601 (ex.: "2026-10-16T18:00:00.000Z") e obrigatoriamente no futuro.
function validarDataFutura(valor: unknown, nome: string, erros: string[]): Date {
  const data = new Date(texto(valor));
  if (Number.isNaN(data.getTime())) {
    erros.push(`${nome} deve ser uma data ISO 8601`);
  } else if (data.getTime() <= Date.now()) {
    erros.push(`${nome} deve estar no futuro`);
  }
  return data;
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

export function validarCarga(body: unknown): Resultado<DadosCarga> {
  const b = corpo(body);
  const erros: string[] = [];

  const dados: DadosCarga = {
    tipo_carga: obrigatorio(b.tipo_carga, "tipo_carga", erros),
    origem: validarPonto(b.origem, "origem", erros),
    destino: validarPonto(b.destino, "destino", erros),
    peso_kg: numeroPositivo(b.peso_kg, "peso_kg", erros),
    valor_oferecido: numeroPositivo(b.valor_oferecido, "valor_oferecido", erros),
    urgencia: validarUrgencia(b.urgencia, erros),
    certificacao_requerida_id: validarUuidOpcional(
      b.certificacao_requerida_id,
      "certificacao_requerida_id",
      erros,
    ),
    expira_em: validarDataFutura(b.expira_em, "expira_em", erros),
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}
