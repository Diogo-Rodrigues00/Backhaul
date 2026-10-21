// Web (ADR 0009): o react-native-web gera HTML semântico; o anúncio usa a região viva do RegiaoViva.
import type { RefObject } from 'react';

import { type AlvoFoco, emitirAnuncio } from './a11yComum';

export * from './a11yComum';

export function anunciar(mensagem: string): void {
  emitirAnuncio(mensagem);
}

export function moverFoco(ref: RefObject<unknown>): void {
  const alvo = ref.current as AlvoFoco | null;
  alvo?.focus?.();
}
