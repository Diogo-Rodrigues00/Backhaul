// Ponte para o TanStack Query (ADR 0004, adendo). Os hooks de `*.hooks.ts` não importam o pacote:
// importam daqui, e este arquivo não o puxa para o JS inicial. Quem carrega o TanStack de verdade é
// `state/consultas/consultas.tsx` (um chunk só, sob demanda, nas áreas logadas); ao carregar, ele
// chama `definirTanstack`. Por que não um `import` normal nos hooks: o Metro move para o chunk comum
// (JS inicial de toda rota) o que dois chunks assíncronos importam, e o TanStack ia junto.
import type * as TanstackQuery from '@tanstack/react-query';

type Implementacao = Pick<typeof TanstackQuery, 'useMutation' | 'useQuery' | 'useQueryClient'>;

let implementacao: Implementacao | null = null;

/** Chamado uma vez, pelo módulo que carrega o TanStack (e pelo setup dos testes). */
export function definirTanstack(carregada: Implementacao): void {
  implementacao = carregada;
}

function obter(): Implementacao {
  if (implementacao === null) {
    throw new Error(
      'O TanStack Query ainda não foi carregado: o corpo da tela deve ser aberto por carregarComConsultas (state/consultas).',
    );
  }
  return implementacao;
}

// Mesmos tipos do pacote; o `never` de retorno só aceita a chamada repassada sem reescrever as sobrecargas.
export const useQuery: typeof TanstackQuery.useQuery = (...argumentos: unknown[]): never =>
  (obter().useQuery as (...a: unknown[]) => never)(...argumentos);

export const useMutation: typeof TanstackQuery.useMutation = (...argumentos: unknown[]): never =>
  (obter().useMutation as (...a: unknown[]) => never)(...argumentos);

export const useQueryClient: typeof TanstackQuery.useQueryClient = (...argumentos: unknown[]) =>
  (obter().useQueryClient as (...a: unknown[]) => TanstackQuery.QueryClient)(...argumentos);
