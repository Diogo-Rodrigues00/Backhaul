// Hook de certificações (TanStack Query). A chamada fica em `certificacoes.ts`.
import { useQuery } from './tanstack';

import { listarCertificacoes } from './certificacoes';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';

export function useCertificacoes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.certificacoes(),
    queryFn: listarCertificacoes,
    // A lista quase não muda: não precisa ser buscada de novo a cada tela.
    staleTime: 10 * 60_000,
    ...opcoesDeLeitura(opcoes),
  });
}
