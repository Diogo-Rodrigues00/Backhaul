// Módulo das consultas (TanStack Query) das áreas logadas (ADR 0004, adendo). É o ÚNICO arquivo do
// app que importa o pacote (junto com `api/consulta.ts`, que só ele usa): o Metro o põe num chunk
// próprio, aberto por `import()` em `carregarComConsultas`, e o JS inicial de nenhuma rota o inclui.
// Ao carregar ele (1) entrega o TanStack à ponte dos hooks e (2) registra a limpeza do cache na
// sessão, para `entrar` e `sair` esvaziarem o cache mesmo sem nenhuma tela de dados montada.
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { ComponentType, ReactNode } from 'react';

import { criarQueryClient } from '@/api/consulta';
import { definirTanstack } from '@/api/tanstack';
import { registrarLimpezaDaSessao } from '@/state/sessao/limpezas';

definirTanstack({ useMutation, useQuery, useQueryClient });

// Um cliente por abertura do app, criado na primeira tela de dados. `entrar` e `sair` o esvaziam
// (mesma instância), como acontecia com o cliente do layout raiz antes do ADR 0004, adendo.
let clienteUnico: QueryClient | undefined;

export function clienteDeConsultas(): QueryClient {
  clienteUnico ??= criarQueryClient();
  return clienteUnico;
}

registrarLimpezaDaSessao(() => clienteUnico?.clear());

/** Provê o cliente de dados às telas que carregam sob demanda. `cliente` só serve aos testes. */
export function ProvedorDeConsultas({
  children,
  cliente,
}: {
  children: ReactNode;
  cliente?: QueryClient;
}) {
  return (
    <QueryClientProvider client={cliente ?? clienteDeConsultas()}>{children}</QueryClientProvider>
  );
}

/** Envolve o componente no provider do cliente de dados (o corpo da tela abre `lazy`, já com ele). */
export function comConsultas<C extends ComponentType<never>>(Componente: C): C {
  // O tipo de fora é o mesmo do corpo; por dentro as propriedades só passam adiante.
  const Corpo = Componente as ComponentType<object>;
  function ComConsultas(props: object) {
    return (
      <ProvedorDeConsultas>
        <Corpo {...props} />
      </ProvedorDeConsultas>
    );
  }
  ComConsultas.displayName = `ComConsultas(${Componente.displayName ?? Componente.name})`;
  return ComConsultas as unknown as C;
}
