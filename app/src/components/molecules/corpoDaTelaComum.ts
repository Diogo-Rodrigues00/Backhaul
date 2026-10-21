import type { ReactNode } from 'react';

export interface PropsCorpoDaTela {
  /** Cabeçalho e `<main>`: o que rola com a página. */
  children: ReactNode;
  /** Barra de abas (ou nada): fica fixa na base da janela. */
  barra?: ReactNode;
}
