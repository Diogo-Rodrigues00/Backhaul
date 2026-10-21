// QueryClient do app (ADR 0004 e 0010). Criado uma vez, no _layout raiz (cards seguintes);
// a função existe para os testes criarem um cliente isolado por teste.
import { QueryClient } from '@tanstack/react-query';

import { eErro4xx } from '@/lib/erros';

import { configurarFoco } from './foco';

/** Intervalo da atualização automática das telas de espera (ADR 0010). */
export const INTERVALO_ATUALIZACAO_MS = 10_000;

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

export type OpcoesLeitura = {
  /** Liga a atualização a cada 10 s, só com a aba visível (ADR 0010). */
  automatico?: boolean;
  /** Falso mantém a consulta parada (sem sessão ou servidor ainda não pronto, ADR 0005). */
  habilitado?: boolean;
};

/** Opções de polling e habilitação comuns aos hooks de leitura. */
export function opcoesDeLeitura({ automatico = false, habilitado = true }: OpcoesLeitura = {}) {
  return {
    enabled: habilitado,
    refetchInterval: automatico ? INTERVALO_ATUALIZACAO_MS : (false as const),
  };
}
