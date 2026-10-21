// iPhone (ADR 0009): o iOS ignora aria-live, então o anúncio vai pelo AccessibilityInfo.
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import type { Component, RefObject } from 'react';

import { emitirAnuncio } from './a11yComum';

export * from './a11yComum';

export function anunciar(mensagem: string): void {
  const texto = mensagem.trim();
  if (texto === '') return;
  emitirAnuncio(texto);
  AccessibilityInfo.announceForAccessibility(texto);
}

export function moverFoco(ref: RefObject<unknown>): void {
  const alvo = ref.current;
  if (!alvo) return;
  const etiqueta = findNodeHandle(alvo as Component);
  if (etiqueta !== null) AccessibilityInfo.setAccessibilityFocus(etiqueta);
}
