// Hook de cancelar disponibilidade (TanStack Query). A chamada fica em `cancelarDisponibilidade.ts`.
import { useMutation, useQueryClient } from './tanstack';

import { cancelarDisponibilidade } from './cancelarDisponibilidade';
import { chaves } from './chaves';

/**
 * Invalida: disponibilidades.minhas (a lista muda), propostas.minhas (as pendentes feitas com ela viram
 * `recusada`) e cargas.proximas (a ativa muda). Não espera as invalidações: a tela não fica presa ao
 * "Cancelando…" se a releitura demorar. A tela de Minhas disponibilidades ainda chama `atualizar()` do
 * provider depois do 200, para reler a lista na própria tela (ver o corpo da tela).
 */
export function useCancelarDisponibilidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarDisponibilidade(id),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: chaves.disponibilidades.minhas() });
      void cliente.invalidateQueries({ queryKey: chaves.propostas.minhas() });
      void cliente.invalidateQueries({ queryKey: chaves.cargas.proximas() });
    },
  });
}
