// Hooks de sessão e cadastro (TanStack Query). Só as áreas logadas carregam o TanStack (ADR 0004,
// adendo): as telas públicas chamam os fetchers de `sessao.ts` direto.
import { useMutation, useQuery } from './tanstack';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import { buscarEu, cadastrarEmpresa, cadastrarMotorista, entrarNaApi } from './sessao';
import type { CorpoLogin } from './tipos';

export function useEu(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.eu(),
    queryFn: buscarEu,
    ...opcoesDeLeitura(opcoes),
  });
}

export function useEntrar() {
  return useMutation({
    mutationFn: ({ email, senha }: CorpoLogin) => entrarNaApi(email, senha),
  });
}

export function useCadastrarEmpresa() {
  return useMutation({ mutationFn: cadastrarEmpresa });
}

export function useCadastrarMotorista() {
  return useMutation({ mutationFn: cadastrarMotorista });
}
