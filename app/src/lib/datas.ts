// Datas de calendário (sem hora) digitadas em três partes: dia, mês e ano (card 031, D-PO-02: nada
// de seletor de data nativo). Funções puras; não leem o relógio, exceto `hojeLocal`.

const SO_DIGITOS = /^\d+$/;

/** `AAAA-MM-DD` com zeros à esquerda, como o contrato da API. */
function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

function quatroDigitos(numero: number): string {
  return String(numero).padStart(4, '0');
}

/**
 * Monta `AAAA-MM-DD` a partir do texto digitado. Devolve `null` quando a data não existe: parte vazia
 * ou com letra, mês fora de 1 a 12, dia que o mês não tem (31/04, 29/02 fora de ano bissexto) ou ano
 * que não tem 4 dígitos ("27" não vira 2027). Espaços nas pontas são ignorados.
 */
export function montarData(dia: string, mes: string, ano: string): string | null {
  const d = dia.trim();
  const m = mes.trim();
  const a = ano.trim();
  if (!SO_DIGITOS.test(d) || !SO_DIGITOS.test(m) || !SO_DIGITOS.test(a)) return null;
  if (d.length > 2 || m.length > 2 || a.length !== 4) return null;

  const numeroDia = Number(d);
  const numeroMes = Number(m);
  const numeroAno = Number(a);
  // Ano abaixo de 1000 não é validade de documento (e `Date.UTC` trata 0 a 99 como 1900 a 1999).
  if (numeroAno < 1000 || numeroMes < 1 || numeroMes > 12 || numeroDia < 1) return null;

  // Dia 0 do mês seguinte = último dia deste mês (em UTC, sem fuso nem horário de verão no meio).
  const ultimoDia = new Date(Date.UTC(numeroAno, numeroMes, 0)).getUTCDate();
  if (numeroDia > ultimoDia) return null;

  return `${quatroDigitos(numeroAno)}-${doisDigitos(numeroMes)}-${doisDigitos(numeroDia)}`;
}

/** Divide `AAAA-MM-DD` em dia, mês e ano (texto), para preencher os três campos. Inválida: tudo vazio. */
export function separarData(data: string | null | undefined): {
  dia: string;
  mes: string;
  ano: string;
} {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data ?? '');
  if (!partes) return { dia: '', mes: '', ano: '' };
  return { dia: partes[3] ?? '', mes: partes[2] ?? '', ano: partes[1] ?? '' };
}

/** Hoje no relógio do aparelho, `AAAA-MM-DD` (não UTC: é o dia que a pessoa vê no calendário). */
export function hojeLocal(agora: Date = new Date()): string {
  return `${quatroDigitos(agora.getFullYear())}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** Hoje em UTC, `AAAA-MM-DD`: é o dia com que o backend compara a validade. */
export function hojeUtc(agora: Date = new Date()): string {
  return agora.toISOString().slice(0, 10);
}

/**
 * Primeira validade que o backend aceita agora: o maior entre o dia local e o dia em UTC. À noite
 * (21h às 24h em Brasília) o dia UTC já é o seguinte, e "hoje" seria recusado como passado.
 */
export function primeiraValidadeAceita(agora: Date = new Date()): string {
  const local = hojeLocal(agora);
  const utc = hojeUtc(agora);
  return local > utc ? local : utc;
}

/** `true` quando `data` (`AAAA-MM-DD`) é anterior a `hoje`. Texto ISO de data compara como texto. */
export function dataNoPassado(data: string, hoje: string = hojeLocal()): boolean {
  return data < hoje;
}
