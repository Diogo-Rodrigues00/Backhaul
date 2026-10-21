import { useEffect, type RefObject } from 'react';

import { moverFoco } from '@/lib/a11y';

// A primeira tela montada depois de abrir o app é a "carga inicial": o foco fica onde o navegador
// o pôs (recarregar não rouba o foco). Toda tela montada depois é navegação no cliente.
let cargaInicialFeita = false;

/** Só para testes: volta ao estado de "app recém-aberto". */
export function reiniciarCargaInicial(): void {
  cargaInicialFeita = false;
}

/**
 * Leva o foco ao `h1` quando a tela é aberta por navegação no cliente (ADR 0009), para o leitor
 * de tela anunciar o novo título. Na carga inicial não faz nada. O `h1` precisa de `tabIndex={-1}`.
 */
export function useFocoNoTitulo(ref: RefObject<unknown>): void {
  useEffect(() => {
    if (!cargaInicialFeita) {
      cargaInicialFeita = true;
      return;
    }
    moverFoco(ref);
  }, [ref]);
}
