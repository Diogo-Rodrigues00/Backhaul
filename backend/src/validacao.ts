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

export type DadosDisponibilidade = {
  local: Ponto;
  raio_busca_km: number;
  urgencia: Urgencia;
  expira_em: Date;
};

export type DadosBuscaProximas = { lat: number; lng: number; raio_km: number };

export type TipoProposta = "aceite" | "contraproposta";

// valor_proposto é null no "aceite": quem decide o valor é a carga (valor_oferecido).
export type DadosProposta = {
  chamado_carga_id: string;
  chamado_disp_id: string;
  tipo: TipoProposta;
  valor_proposto: number | null;
};

export type AcaoResposta = "aceitar" | "recusar";

export type StatusEntrega = "aceito" | "em_transito" | "entregue" | "cancelado";

const SENHA_MINIMO = 8;

// Mesmos valores do ENUM status_entrega do schema.sql. Aqui só se confere se o valor
// EXISTE (senão 400); se a mudança é permitida a partir do status atual, quem decide
// é a tabela de transições em rotas/fretes.ts (senão 409).
const STATUS_ENTREGA: readonly StatusEntrega[] = ["aceito", "em_transito", "entregue", "cancelado"];

// Mesmos valores do ENUM tipo_proposta do schema.sql.
const TIPOS_PROPOSTA: readonly TipoProposta[] = ["aceite", "contraproposta"];

const ACOES_RESPOSTA: readonly AcaoResposta[] = ["aceitar", "recusar"];

// valor_proposto é NUMERIC(10,2): acima disso o Postgres dá erro 22003, que viraria 500.
const VALOR_MAXIMO = 99_999_999.99;

// Raio padrão: o mesmo DEFAULT 50 de chamados_disponibilidade.raio_busca_km.
const RAIO_PADRAO_KM = 50;

// Limite de negócio (um motorista não busca carga a 2000 km) e também de banco:
// raio_busca_km é NUMERIC(6,2), que estoura acima de 9999.99 (erro 22003 → 500).
const RAIO_MAXIMO_KM = 500;

// Número escrito na query string: "-18.9186" passa; "", "abc", "1e3" e "12," não.
// Necessário porque Number("") dá 0, e um lat vazio viraria a linha do Equador.
const REGEX_NUMERO = /^-?\d+(\.\d+)?$/;

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

// Dígito verificador (módulo 11), igual para CPF e CNPJ: soma cada dígito vezes um peso,
// e o dígito esperado é 0 se o resto da divisão por 11 for menor que 2; senão, 11 - resto.
function digitoVerificador(digitos: string, pesos: number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + Number(digitos[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// Recebe só dígitos. Sequências como 111.111.111-11 passam na conta, mas não são CPFs reais.
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const d1 = digitoVerificador(cpf, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(cpf, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const d1 = digitoVerificador(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

// Placa padrão antigo (ABC1234) ou Mercosul (ABC1D23). Aceita hífen/espaço e minúsculas
// na entrada, mas sempre devolve sem pontuação e em maiúsculas.
const REGEX_PLACA = /^[A-Z]{3}\d[A-Z\d]\d{2}$/;

export function normalizarPlaca(valor: string): string {
  return valor.replace(/[\s-]/g, "").toUpperCase();
}

function validarPlaca(valor: unknown, erros: string[]): string {
  const placa = normalizarPlaca(texto(valor));
  if (!REGEX_PLACA.test(placa)) erros.push("veiculo_placa inválida (use ABC1234 ou ABC1D23)");
  return placa;
}

// Remove a pontuação, confere a quantidade de dígitos (11 para CPF, 14 para CNPJ)
// e os dígitos verificadores (um CPF/CNPJ digitado errado quase nunca fecha a conta).
function validarDocumento(valor: unknown, nome: string, digitos: number, erros: string[]): string {
  const bruto = texto(valor);
  const limpo = bruto.replace(/\D/g, "");
  if (!REGEX_DOCUMENTO.test(bruto) || limpo.length !== digitos) {
    erros.push(`${nome} deve ter ${digitos} dígitos`);
  } else if (!(digitos === 11 ? cpfValido(limpo) : cnpjValido(limpo))) {
    erros.push(`${nome} inválido`);
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
  return {
    lat: entre(lat, -90, 90, `${nome}.lat`, erros),
    lng: entre(lng, -180, 180, `${nome}.lng`, erros),
  };
}

function entre(n: number, min: number, max: number, nome: string, erros: string[]): number {
  if (!Number.isFinite(n) || n < min || n > max) {
    erros.push(`${nome} deve ser um número entre ${min} e ${max}`);
  }
  return n;
}

// Mesma regra para o raio do POST /disponibilidades e do GET /cargas/proximas.
function validarRaio(n: number, nome: string, erros: string[]): number {
  if (!Number.isFinite(n) || n <= 0 || n > RAIO_MAXIMO_KM) {
    erros.push(`${nome} deve ser um número maior que zero e até ${RAIO_MAXIMO_KM}`);
  }
  return n;
}

// Tudo que vem na query string é texto (ou lista, se o parâmetro se repetir: ?lat=1&lat=2).
// Qualquer coisa fora do formato vira NaN, e quem chamou acusa o erro.
function numeroDaQuery(valor: unknown): number {
  return typeof valor === "string" && REGEX_NUMERO.test(valor.trim()) ? Number(valor) : NaN;
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

function validarUuidObrigatorio(valor: unknown, nome: string, erros: string[]): string {
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
    veiculo_placa: validarPlaca(b.veiculo_placa, erros),
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

export function validarDisponibilidade(body: unknown): Resultado<DadosDisponibilidade> {
  const b = corpo(body);
  const erros: string[] = [];

  // raio_busca_km é opcional, como a urgência: se não vier, vale o DEFAULT do banco.
  // Se vier, tem que ser number de verdade (texto "80" não passa, igual ao peso_kg).
  const raio =
    b.raio_busca_km === undefined || b.raio_busca_km === null
      ? RAIO_PADRAO_KM
      : typeof b.raio_busca_km === "number" ? b.raio_busca_km : NaN;

  const dados: DadosDisponibilidade = {
    local: validarPonto(b.local, "local", erros),
    raio_busca_km: validarRaio(raio, "raio_busca_km", erros),
    urgencia: validarUrgencia(b.urgencia, erros),
    expira_em: validarDataFutura(b.expira_em, "expira_em", erros),
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

// Para ids que chegam na URL (ex.: /cargas/:id/propostas). Mesmo motivo do REGEX_UUID:
// sem isso, "/cargas/abc/propostas" viraria erro 22P02 no Postgres e 500 aqui.
export function validarId(valor: unknown, nome: string): Resultado<string> {
  const t = texto(valor);
  return REGEX_UUID.test(t) ? { ok: true, dados: t } : { ok: false, erros: [`${nome} deve ser um UUID válido`] };
}

export function validarProposta(body: unknown): Resultado<DadosProposta> {
  const b = corpo(body);
  const erros: string[] = [];

  const tipo = b.tipo as TipoProposta;
  if (!TIPOS_PROPOSTA.includes(tipo)) erros.push(`tipo deve ser ${TIPOS_PROPOSTA.join(" ou ")}`);

  // No aceite o valor que vier é ignorado (a rota usa o valor_oferecido da carga).
  // Na contraproposta ele é o motivo da proposta existir, então é obrigatório.
  let valor: number | null = null;
  if (tipo === "contraproposta") {
    valor = numeroPositivo(b.valor_proposto, "valor_proposto", erros);
    if (valor > VALOR_MAXIMO) erros.push(`valor_proposto deve ser no máximo ${VALOR_MAXIMO}`);
  }

  const dados: DadosProposta = {
    chamado_carga_id: validarUuidObrigatorio(b.chamado_carga_id, "chamado_carga_id", erros),
    chamado_disp_id: validarUuidObrigatorio(b.chamado_disp_id, "chamado_disp_id", erros),
    tipo,
    valor_proposto: valor,
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

export function validarRespostaProposta(body: unknown): Resultado<AcaoResposta> {
  const acao = corpo(body).acao as AcaoResposta;
  return ACOES_RESPOSTA.includes(acao)
    ? { ok: true, dados: acao }
    : { ok: false, erros: [`acao deve ser ${ACOES_RESPOSTA.join(" ou ")}`] };
}

export function validarStatusEntrega(body: unknown): Resultado<StatusEntrega> {
  const status = corpo(body).status_entrega as StatusEntrega;
  return STATUS_ENTREGA.includes(status)
    ? { ok: true, dados: status }
    : { ok: false, erros: [`status_entrega deve ser ${STATUS_ENTREGA.join(", ")}`] };
}

// Recebe req.query. Aqui os três parâmetros são obrigatórios: sem ponto não há "perto de".
export function validarBuscaProximas(query: unknown): Resultado<DadosBuscaProximas> {
  const q = corpo(query);
  const erros: string[] = [];

  const dados: DadosBuscaProximas = {
    lat: entre(numeroDaQuery(q.lat), -90, 90, "lat", erros),
    lng: entre(numeroDaQuery(q.lng), -180, 180, "lng", erros),
    raio_km: validarRaio(numeroDaQuery(q.raio_km), "raio_km", erros),
  };

  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

export type DadosCertificacao = { certificacao_id: string; numero_certificado: string; validade: string };

// Data de calendário "AAAA-MM-DD". Só o formato não basta ("2026-02-31" passa no regex),
// por isso a data é reconstruída e comparada: se o dia não existe, o JS "corrige" e não bate.
function validarDataCalendario(valor: unknown, nome: string, erros: string[]): string {
  const t = texto(valor);
  const d = new Date(`${t}T00:00:00.000Z`);
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
  if (!valida) erros.push(`${nome} deve ser uma data válida no formato AAAA-MM-DD`);
  return t;
}

// Motorista envia a própria certificação (MOPP etc.) para o admin aprovar.
export function validarEnvioCertificacao(body: unknown): Resultado<DadosCertificacao> {
  const b = corpo(body);
  const erros: string[] = [];
  const dados: DadosCertificacao = {
    certificacao_id: validarUuidObrigatorio(b.certificacao_id, "certificacao_id", erros),
    numero_certificado: obrigatorio(b.numero_certificado, "numero_certificado", erros),
    validade: validarDataCalendario(b.validade, "validade", erros),
  };
  if (dados.numero_certificado.length > 60) erros.push("numero_certificado deve ter no máximo 60 caracteres");
  // Data vencida não tem como ser aprovada: melhor avisar já no envio.
  if (erros.length === 0 && dados.validade < new Date().toISOString().slice(0, 10)) {
    erros.push("validade não pode estar no passado");
  }
  return erros.length ? { ok: false, erros } : { ok: true, dados };
}

export type DecisaoCertificacao = "aprovar" | "recusar";
const DECISOES_CERTIFICACAO: readonly DecisaoCertificacao[] = ["aprovar", "recusar"];

export function validarDecisaoCertificacao(body: unknown): Resultado<DecisaoCertificacao> {
  const acao = corpo(body).acao as DecisaoCertificacao;
  return DECISOES_CERTIFICACAO.includes(acao)
    ? { ok: true, dados: acao }
    : { ok: false, erros: [`acao deve ser ${DECISOES_CERTIFICACAO.join(" ou ")}`] };
}
