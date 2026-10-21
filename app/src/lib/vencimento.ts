import type { StatusCarga, StatusDisponibilidade } from './rotulos';

// Status que ganham "expirado" quando o prazo passa (CT-10).
export type StatusComPrazo = StatusCarga | StatusDisponibilidade;

// CT-10: só `aberto` vence. Fechado ou cancelado continuam como estão.
// `agora` é injetável para teste; por padrão, o relógio do aparelho.
export function estaVencido(
  status: StatusComPrazo,
  expiraEm: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (status !== 'aberto' || !expiraEm) return false;
  const fim = Date.parse(expiraEm);
  return !Number.isNaN(fim) && fim <= agora.getTime();
}

// Status que a tela deve mostrar: aberto vencido vira "expirado".
export function statusEfetivo<S extends StatusComPrazo>(
  status: S,
  expiraEm: string | null | undefined,
  agora: Date = new Date(),
): S | 'expirado' {
  return estaVencido(status, expiraEm, agora) ? 'expirado' : status;
}
