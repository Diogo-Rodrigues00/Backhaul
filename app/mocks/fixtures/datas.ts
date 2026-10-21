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
