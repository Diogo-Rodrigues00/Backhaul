import { Platform } from 'react-native';

import { correspondeBp, useLargura } from '@/theme/responsivo';
import type { NivelFonte } from '@/theme/tipografia';

import { Texto, type PropsTexto } from './Texto';

export type NivelTitulo = 1 | 2 | 3;

// Nível semântico → degrau da escala (DS 3.3): h1 = 3xl, h2 = xl, h3 = lg.
const NIVEL_VISUAL: Record<NivelTitulo, NivelFonte> = { 1: '3xl', 2: 'xl', 3: 'lg' };
// h1 em tela estreita (até 720 px): 30/36, que é o degrau 2xl (DS 3.3).
const NIVEL_VISUAL_H1_ESTREITO: NivelFonte = '2xl';
// Web: o CSS global (css.ts) troca o tamanho por @media usando este atributo, sem JavaScript.
const ATRIBUTOS_H1: Readonly<Record<string, string>> = { titulo: '1' };

export interface PropsTitulo extends Omit<PropsTexto, 'nivel' | 'role'> {
  /** Nível do título no documento: 1 (um por tela), 2 ou 3, sem saltos. */
  nivel: NivelTitulo;
}

/**
 * Título: `role="heading"` + `aria-level` (vira `<h1>`…`<h3>` na web; "título" no VoiceOver).
 * Aceita `ref` e `tabIndex={-1}` para o foco ir ao h1 ao trocar de rota (ADR 0009).
 * O h1 tem 38/44 e cai para 30/36 até 720 px: na web por CSS (HTML estático sem salto na
 * hidratação), no iPhone por `useLargura()`.
 */
export function Titulo({ nivel, ...resto }: PropsTitulo) {
  const largura = useLargura();
  const web = Platform.OS === 'web';
  const estreitoNoIphone = !web && nivel === 1 && correspondeBp('so-celular', largura);

  return (
    <Texto
      nivel={estreitoNoIphone ? NIVEL_VISUAL_H1_ESTREITO : NIVEL_VISUAL[nivel]}
      role="heading"
      aria-level={nivel}
      dataSet={nivel === 1 ? ATRIBUTOS_H1 : undefined}
      {...resto}
    />
  );
}
