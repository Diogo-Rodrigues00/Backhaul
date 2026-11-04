// Datas das fixtures, relativas ao momento em que o módulo é carregado, para que cargas e
// disponibilidades de exemplo nunca pareçam vencidas na demonstração. Formato ISO 8601 do contrato.

const HORA_MS = 60 * 60 * 1000;

function deslocada(horas: number): string {
  return new Date(Date.now() + horas * HORA_MS).toISOString();
}

/** Data ISO daqui a `horas` horas (negativo = no passado). */
export const daquiAHoras = deslocada;

/** `YYYY-MM-DD` (como o contrato mostra `validade`). */
export function dataSemHora(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * `YYYY-MM-DD` (UTC, como o backend compara `validade`) daqui a `dias` dias; negativo = no passado.
 * Use no lugar de datas escritas à mão: um literal como '2030-05-01' vira passado com o tempo.
 */
export function dataDaquiADias(dias: number): string {
  return dataSemHora(deslocada(dias * 24));
}
