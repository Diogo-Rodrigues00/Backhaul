// Hook de publicar disponibilidade (TanStack Query). A chamada fica em `publicarDisponibilidade.ts`.
import { useMutation, useQueryClient } from './tanstack';

import { chaves } from './chaves';
import { publicarDisponibilidade } from './publicarDisponibilidade';

/** Invalida: disponibilidades.minhas. */
export function usePublicarDisponibilidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: publicarDisponibilidade,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.disponibilidades.minhas() }),
  });
}
