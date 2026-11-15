// Hook de cancelar disponibilidade (TanStack Query). A chamada fica em `cancelarDisponibilidade.ts`.
import { useMutation, useQueryClient } from './tanstack';

import { cancelarDisponibilidade } from './cancelarDisponibilidade';
import { chaves } from './chaves';

/**
 * Invalida: disponibilidades.minhas (a lista muda; a API já devolve `cancelado`), propostas.minhas (as
 * pendentes feitas com ela viram `recusada`) e cargas.proximas (a ativa muda). A mutation só termina
 * depois dessas releituras, para a tela anunciar a troca de ativa com a lista já nova. Um erro na
 * releitura não falha o cancelamento: a invalidação não lança.
 */
export function useCancelarDisponibilidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarDisponibilidade(id),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.disponibilidades.minhas() }),
        cliente.invalidateQueries({ queryKey: chaves.propostas.minhas() }),
        cliente.invalidateQueries({ queryKey: chaves.cargas.proximas() }),
      ]),
  });
}
