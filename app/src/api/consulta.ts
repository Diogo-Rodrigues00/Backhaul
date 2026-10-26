// QueryClient do app (ADR 0004 e 0010). Quem importa este arquivo carrega o TanStack Query: só o
// módulo de consultas das áreas logadas (`state/consultas/consultas.tsx`) e os testes. Os hooks usam
// `leitura.ts` e `tanstack.ts`. A função existe para os testes criarem um cliente isolado por teste.
import { QueryClient } from '@tanstack/react-query';

import { eErro4xx } from '@/lib/erros';

import { configurarFoco } from './foco';

export { INTERVALO_ATUALIZACAO_MS, opcoesDeLeitura, type OpcoesLeitura } from './leitura';

/** Uma nova tentativa só para falhas que podem passar (rede, 5xx); 4xx nunca repete. */
export function repetirConsulta(falhas: number, erro: unknown): boolean {
  return !eErro4xx(erro) && falhas < 1;
}

export function criarQueryClient(): QueryClient {
  configurarFoco();
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: repetirConsulta,
        staleTime: 5_000,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
      mutations: { retry: 0 },
    },
  });
}
