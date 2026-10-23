// Disponibilidades do motorista: GET /disponibilidades/minhas (o POST está em publicarDisponibilidade.ts).
// PROPOSTA relatório 4b: GET /disponibilidades/minhas ainda não existe no backend; o formato
// está em tipos.ts. Quando entrar em docs/api.md, conferir.
import { useQuery } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type { RespostaMinhasDisponibilidades } from './tipos';

export function listarMinhasDisponibilidades(): Promise<RespostaMinhasDisponibilidades> {
  return requisitar<RespostaMinhasDisponibilidades>('GET', '/disponibilidades/minhas');
}

export function useMinhasDisponibilidades(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.disponibilidades.minhas(),
    queryFn: listarMinhasDisponibilidades,
    ...opcoesDeLeitura(opcoes),
  });
}
