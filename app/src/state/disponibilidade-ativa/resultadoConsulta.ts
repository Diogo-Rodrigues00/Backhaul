import type { RespostaMinhasDisponibilidades } from '@/api/tipos';

/** O que o provider precisa saber da consulta `GET /disponibilidades/minhas`. */
export interface ResultadoConsulta {
  data: RespostaMinhasDisponibilidades | undefined;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

// Sem consulta (sessão ainda não autenticada como motorista): nada foi lido.
export const SEM_CONSULTA: ResultadoConsulta = {
  data: undefined,
  error: null,
  isError: false,
  isPending: true,
  isFetching: false,
  refetch: () => Promise.resolve(),
};
