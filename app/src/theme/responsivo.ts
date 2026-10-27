import { useWindowDimensions } from 'react-native';

import { breakpoints } from './tokens';

// Responsivo sem JavaScript na primeira pintura (ADR 0008).
// Web: a View recebe `dataSet={dataBp('so-celular')}`, vira `data-bp="so-celular"` e o CSS global
// (css.ts) esconde por @media. iPhone: `useLargura()` e `correspondeBp()`.

/** Nomes em português dos pontos de quebra de `breakpoints` (compact, phone, tabbar, wide). */
export const pontosDeQuebra = {
  compacto: breakpoints.compact,
  celular: breakpoints.phone,
  barra: breakpoints.tabbar,
  largo: breakpoints.wide,
} as const;

export type NomePontoDeQuebra = keyof typeof pontosDeQuebra;

/** `so-X`: aparece só até a largura de X. `sem-X`: aparece só acima dela. */
export type NomeBp = `so-${NomePontoDeQuebra}` | `sem-${NomePontoDeQuebra}`;

/** Valor do `dataSet` do react-native-web (vira o atributo `data-bp`). */
export function dataBp(nome: NomeBp): { bp: NomeBp } {
  return { bp: nome };
}

/** Decide, com a largura em px, se um `NomeBp` está visível. Mesma regra do CSS gerado. */
export function correspondeBp(nome: NomeBp, largura: number): boolean {
  const soAte = nome.startsWith('so-');
  const limite = pontosDeQuebra[nome.slice(soAte ? 3 : 4) as NomePontoDeQuebra];
  return soAte ? largura <= limite : largura > limite;
}

/** Largura da janela em px. Use no iPhone; na web prefira `dataBp` (o HTML estático não sabe a largura). */
export function useLargura(): number {
  return useWindowDimensions().width;
}
