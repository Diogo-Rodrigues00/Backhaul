// Hook de disponibilidades do motorista (TanStack Query). A chamada fica em `disponibilidades.ts`.
import { useQuery } from './tanstack';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import { listarMinhasDisponibilidades } from './disponibilidades';

export function useMinhasDisponibilidades(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.disponibilidades.minhas(),
    queryFn: listarMinhasDisponibilidades,
    ...opcoesDeLeitura(opcoes),
  });
}
