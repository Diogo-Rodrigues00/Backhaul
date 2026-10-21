// Utilitário de testes (não entra no app): renderiza a UI dentro do expo-router, na URL pedida,
// com o tema. Componentes que usam `Link`, `usePathname` ou o foco da rota precisam disso.
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactElement, ReactNode } from 'react';

import { TemaContext, type ValorTema } from '@/state/tema/TemaProvider';

import { valorDoTema } from './renderComTema';

interface Opcoes {
  /** URL aberta no início. Padrão: "/". */
  url?: string;
  /** Rotas existentes, além de "/" (ex.: "empresa/cargas"). Todas mostram a mesma UI. */
  rotas?: string[];
  /** Sobrescreve partes do valor do tema (ex.: `alternar` espiado). */
  tema?: Partial<ValorTema>;
}

export async function renderizarComRota(ui: ReactElement, opcoes: Opcoes = {}) {
  const { url = '/', rotas = [], tema } = opcoes;

  function Layout({ children }: { children?: ReactNode }) {
    return (
      <TemaContext.Provider value={{ ...valorDoTema('light'), ...tema }}>
        {children ?? <Slot />}
      </TemaContext.Provider>
    );
  }

  const tela = () => ui;
  const arvore: Record<string, () => ReactElement> = { index: tela };
  for (const rota of rotas) arvore[rota] = tela;

  return renderRouter({ _layout: Layout, ...arvore }, { initialUrl: url });
}
