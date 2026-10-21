// Apoio aos testes de hooks e telas: QueryClient isolado, sem repetição automática.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { configurarCliente } from '../src/api/cliente';

export function criarClienteDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      // gcTime infinito: sem cronômetros de limpeza pendentes ao fim do teste.
      mutations: { retry: 0, gcTime: Infinity },
    },
  });
}

export function criarEnvoltorio(cliente: QueryClient = criarClienteDeTeste()) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

/** Faz o cliente HTTP enviar o token de mock (`mock-empresa`, `mock-motorista`, `mock-admin`). */
export function entrarComoMock(
  token: string,
  aoSessaoExpirada: () => void = () => undefined,
): void {
  configurarCliente({ obterToken: () => token, aoSessaoExpirada });
}

/** Volta o cliente HTTP ao estado sem sessão. */
export function sairDoMock(): void {
  configurarCliente({ obterToken: () => null, aoSessaoExpirada: () => undefined });
}
