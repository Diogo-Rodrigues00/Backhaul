// Formatação pt-BR (ADR 0015, D-PO-12). Sem biblioteca de i18n.
// Instâncias de Intl são criadas uma vez, no módulo.
// Entradas numéricas podem chegar como texto (NUMERIC do Postgres, ex.: "3500.00").

export type NumeroEntrada = number | string | null | undefined;
export type DataEntrada = string | Date | null | undefined;

// Valor ausente ou inválido nunca aparece como "NaN" ou "undefined" na tela.
export const SEM_VALOR = '—';

const FUSO_SAO_PAULO = 'America/Sao_Paulo';
// Brasil sem horário de verão desde 2019: UTC-3 fixo.
const DESLOCAMENTO_SAO_PAULO_MS = -3 * 60 * 60 * 1000;
const DATA_SEM_HORA = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMERO_TEXTO = /^-?\d+(\.\d+)?$/;

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatadorDistancia = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const formatadorPeso = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const formatadorPercentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

type FormatadorData = { format(data: Date): string };

// Hermes (iPhone) pode não suportar `timeZone`. Só usamos o Intl se o fuso for aceito de fato;
// senão, cai no ajuste manual de -03:00 (ADR 0015).
function criarFormatadorSaoPaulo(opcoes: Intl.DateTimeFormatOptions): FormatadorData | null {
  try {
    const formatador = new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: FUSO_SAO_PAULO });
    return formatador.resolvedOptions().timeZone === FUSO_SAO_PAULO ? formatador : null;
  } catch {
    return null;
  }
}

const formatadorDataSaoPaulo = criarFormatadorSaoPaulo({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const formatadorDataHoraSaoPaulo = criarFormatadorSaoPaulo({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const doisDigitos = (valor: number): string => String(valor).padStart(2, '0');

function formatarManualSaoPaulo(instante: Date, comHora: boolean): string {
  const local = new Date(instante.getTime() + DESLOCAMENTO_SAO_PAULO_MS);
  const data = [
    doisDigitos(local.getUTCDate()),
    doisDigitos(local.getUTCMonth() + 1),
    local.getUTCFullYear(),
  ].join('/');
  if (!comHora) return data;
  return `${data}, ${doisDigitos(local.getUTCHours())}:${doisDigitos(local.getUTCMinutes())}`;
}

function formatarNoFusoSaoPaulo(instante: Date, comHora: boolean): string {
  const formatador = comHora ? formatadorDataHoraSaoPaulo : formatadorDataSaoPaulo;
  return formatador ? formatador.format(instante) : formatarManualSaoPaulo(instante, comHora);
}

// "YYYY-MM-DD" é dia civil de São Paulo (meia-noite de Brasília), não UTC.
// Data e hora ISO são instantes e são mostradas no fuso de São Paulo.
function paraInstante(valor: DataEntrada): Date | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;

  const texto = valor.trim();
  if (texto === '') return null;

  const somenteData = DATA_SEM_HORA.exec(texto);
  if (somenteData) {
    const ano = Number(somenteData[1]);
    const mes = Number(somenteData[2]);
    const dia = Number(somenteData[3]);
    // Date.UTC "transborda" 2027-02-30 para março; conferir se a data montada é a mesma.
    const calendario = new Date(Date.UTC(ano, mes - 1, dia));
    const valida =
      calendario.getUTCFullYear() === ano &&
      calendario.getUTCMonth() === mes - 1 &&
      calendario.getUTCDate() === dia;
    return valida ? new Date(`${texto}T00:00:00-03:00`) : null;
  }

  const instante = new Date(texto);
  return Number.isNaN(instante.getTime()) ? null : instante;
}

// Aceita número ou texto numérico ("3500.00"). Qualquer outra coisa vira null.
function paraNumero(valor: NumeroEntrada): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const texto = valor.trim();
  return NUMERO_TEXTO.test(texto) ? Number(texto) : null;
}

export function formatarMoeda(valor: NumeroEntrada): string {
  const numero = paraNumero(valor);
  if (numero === null) return SEM_VALOR;
  // O Intl põe um espaço não separável depois de "R$"; o texto de D-PO-12 usa espaço comum.
  return formatadorMoeda.format(numero).replace(/\u00a0/g, ' ');
}

export function formatarDistancia(km: NumeroEntrada): string {
  const numero = paraNumero(km);
  return numero === null ? SEM_VALOR : `${formatadorDistancia.format(numero)} km`;
}

export function formatarPeso(kg: NumeroEntrada): string {
  const numero = paraNumero(kg);
  return numero === null ? SEM_VALOR : `${formatadorPeso.format(numero)} kg`;
}

// Exibe só o que a API devolveu; nunca calcula comissão (RNF-11).
export function formatarPercentual(valor: NumeroEntrada): string {
  const numero = paraNumero(valor);
  return numero === null ? SEM_VALOR : `${formatadorPercentual.format(numero)}%`;
}

// "01/05/2027"
export function formatarData(valor: DataEntrada): string {
  const instante = paraInstante(valor);
  return instante ? formatarNoFusoSaoPaulo(instante, false) : SEM_VALOR;
}

// "01/05/2027, 14:30"
export function formatarDataHora(valor: DataEntrada): string {
  const instante = paraInstante(valor);
  return instante ? formatarNoFusoSaoPaulo(instante, true) : SEM_VALOR;
}

// Validade de certificação: só a data (D-PO-12), aceita "YYYY-MM-DD" ou ISO com hora.
export function formatarValidade(valor: DataEntrada): string {
  return formatarData(valor);
}

// "14:32:08", no fuso de São Paulo (UTC-3 fixo). Usado em "Última atualização às …" (CT-09).
export function formatarHoraCompleta(valor: DataEntrada): string {
  const instante = paraInstante(valor);
  if (!instante) return SEM_VALOR;
  const local = new Date(instante.getTime() + DESLOCAMENTO_SAO_PAULO_MS);
  return [local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()]
    .map(doisDigitos)
    .join(':');
}
