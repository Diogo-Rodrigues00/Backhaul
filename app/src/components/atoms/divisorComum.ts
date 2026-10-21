// Parte comum do DivisorEstrada (web e iPhone desenham o mesmo traço com SVG).
import { brand } from '@/theme/tokens';
import type { Papeis } from '@/theme/variaveis';

/** `ambar`: faixa tracejada do cabeçalho; `cinza`: separador de 3 px (DS 5.1, RoadDivider). */
export type VarianteDivisor = 'ambar' | 'cinza';

export interface PropsDivisor {
  variante?: VarianteDivisor;
}

// Faixa âmbar do cabeçalho (protótipo, .hdr::after): 4 px de altura, 28 px de traço e 16 de vão.
const FAIXA_AMBAR = { espessura: 4, tracejado: '28 16' } as const;
// Separador cinza (protótipo, .rule): usa a borda de 3 px do DS (`border.widthStrong`).
const TRACEJADO_CINZA = '9 6';

export function medidasDivisor(variante: VarianteDivisor, bordaForte: number) {
  return variante === 'ambar'
    ? FAIXA_AMBAR
    : ({ espessura: bordaForte, tracejado: TRACEJADO_CINZA } as const);
}

export function corDoDivisor(colors: Papeis, variante: VarianteDivisor): string {
  return variante === 'ambar' ? brand.amber : colors.border.subtle;
}
