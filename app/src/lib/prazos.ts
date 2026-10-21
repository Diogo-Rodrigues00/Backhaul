// Prazos rápidos de carga e disponibilidade (D-PO-02). Sem seletor de data: caro em a11y na web.

export const OPCOES_PRAZO = [
  { horas: 2, rotulo: 'Em 2 horas' },
  { horas: 6, rotulo: 'Em 6 horas' },
  { horas: 12, rotulo: 'Em 12 horas' },
  { horas: 24, rotulo: 'Em 24 horas' },
  { horas: 48, rotulo: 'Em 48 horas' },
] as const;

export type OpcaoPrazo = (typeof OPCOES_PRAZO)[number];

const MILISSEGUNDOS_POR_HORA = 60 * 60 * 1000;

// Devolve o `expira_em` em ISO (UTC), a partir de "agora". Prazo não positivo é erro de programação.
export function calcularExpiraEm(horas: number, agora: Date = new Date()): string {
  if (!Number.isFinite(horas) || horas <= 0) {
    throw new RangeError('O prazo precisa ser um número de horas maior que zero.');
  }
  return new Date(agora.getTime() + horas * MILISSEGUNDOS_POR_HORA).toISOString();
}
