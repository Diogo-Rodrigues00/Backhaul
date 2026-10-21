// Versão de referência da a11y (sem plataforma). Web e iPhone usam `a11y.web.ts` e `a11y.native.ts`.
// Existe para o TypeScript resolver `@/lib/a11y`. Metro e Jest sempre escolhem o arquivo da plataforma,
// então este não roda em nenhum teste: excluído da cobertura de propósito.
/* istanbul ignore file */
import type { RefObject } from 'react';

import { type AlvoFoco, emitirAnuncio } from './a11yComum';

export * from './a11yComum';

// Anúncio sem mover o foco (ADR 0009).
export function anunciar(mensagem: string): void {
  emitirAnuncio(mensagem);
}

export function moverFoco(ref: RefObject<unknown>): void {
  const alvo = ref.current as AlvoFoco | null;
  alvo?.focus?.();
}
