// Hook de disponibilidades do motorista (TanStack Query). A chamada fica em `disponibilidades.ts`.
import { useQuery } from '@tanstack/react-query';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import { listarMinhasDisponibilidades } from './disponibilidades';

export function useMinhasDisponibilidades(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.disponibilidades.minhas(),
    queryFn: listarMinhasDisponibilidades,
    ...opcoesDeLeitura(opcoes),
  });
}
