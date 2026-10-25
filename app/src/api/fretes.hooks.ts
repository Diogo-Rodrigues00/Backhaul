// Hooks de fretes (TanStack Query). As chamadas e os guardas de tipo ficam em `fretes.ts`.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import { atualizarStatusFrete, listarMeusFretes, pagarFrete } from './fretes';
import type { CorpoStatusFrete } from './tipos';

export function useMeusFretes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.fretes.meus(),
    queryFn: listarMeusFretes,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Invalida: fretes.meus. */
export function useAtualizarStatusFrete() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({
      freteId,
      status,
    }: {
      freteId: string;
      status: CorpoStatusFrete['status_entrega'];
    }) => atualizarStatusFrete(freteId, status),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.fretes.meus() }),
  });
}

/** Invalida: fretes.meus. */
export function usePagarFrete() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: pagarFrete,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.fretes.meus() }),
  });
}
