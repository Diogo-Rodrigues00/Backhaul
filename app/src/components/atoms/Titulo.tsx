import type { NivelFonte } from '@/theme/tipografia';

import { Texto, type PropsTexto } from './Texto';

export type NivelTitulo = 1 | 2 | 3;

// Nível semântico → degrau da escala (DS 3.3): h1 = 3xl, h2 = xl, h3 = lg.
const NIVEL_VISUAL: Record<NivelTitulo, NivelFonte> = { 1: '3xl', 2: 'xl', 3: 'lg' };

export interface PropsTitulo extends Omit<PropsTexto, 'nivel' | 'role'> {
  /** Nível do título no documento: 1 (um por tela), 2 ou 3, sem saltos. */
  nivel: NivelTitulo;
}

/**
 * Título: `role="heading"` + `aria-level` (vira `<h1>`…`<h3>` na web; "título" no VoiceOver).
 * Aceita `ref` e `tabIndex={-1}` para o foco ir ao h1 ao trocar de rota (ADR 0009).
 */
export function Titulo({ nivel, ...resto }: PropsTitulo) {
  return <Texto nivel={NIVEL_VISUAL[nivel]} role="heading" aria-level={nivel} {...resto} />;
}
