// Hooks da chave Pix do motorista (TanStack Query). As chamadas ficam em `chavePix.ts`.
import { useMutation, useQuery, useQueryClient } from './tanstack';

import { lerChavePix, salvarChavePix } from './chavePix';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import type { RespostaChavePix } from './tipos';

/** Chave do motorista logado. Fica só na memória do cache, que é limpo ao sair (ADR 0004). */
export function useChavePix(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.motorista.chavePix(),
    queryFn: lerChavePix,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Cadastra ou troca. Grava a chave normalizada devolvida pela API no cache (sem nova leitura). */
export function useSalvarChavePix() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: salvarChavePix,
    onSuccess: (resposta) => {
      cliente.setQueryData<RespostaChavePix>(chaves.motorista.chavePix(), resposta);
    },
  });
}
