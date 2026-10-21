// Disponibilidades do motorista: POST /disponibilidades e GET /disponibilidades/minhas.
// PROPOSTA relatório 4b: GET /disponibilidades/minhas ainda não existe no backend; o formato
// está em tipos.ts. Quando entrar em docs/api.md, conferir.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type {
  CorpoPublicarDisponibilidade,
  RespostaMinhasDisponibilidades,
  RespostaPublicarDisponibilidade,
} from './tipos';

export function publicarDisponibilidade(
  dados: CorpoPublicarDisponibilidade,
): Promise<RespostaPublicarDisponibilidade> {
  return requisitar<RespostaPublicarDisponibilidade>('POST', '/disponibilidades', {
    corpo: dados,
  });
}

export function listarMinhasDisponibilidades(): Promise<RespostaMinhasDisponibilidades> {
  return requisitar<RespostaMinhasDisponibilidades>('GET', '/disponibilidades/minhas');
}

/** Invalida: disponibilidades.minhas. */
export function usePublicarDisponibilidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: publicarDisponibilidade,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.disponibilidades.minhas() }),
  });
}

export function useMinhasDisponibilidades(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.disponibilidades.minhas(),
    queryFn: listarMinhasDisponibilidades,
    ...opcoesDeLeitura(opcoes),
  });
}
