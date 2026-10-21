import { Platform, type TextStyle } from 'react-native';

import { fonts, type } from './tokens';

export type NivelFonte = keyof typeof type;

/** Dynamic Type no iPhone cresce até 2x (DS 3.3). Passe ao `Text` do atom `Texto`. */
export const maxFontSizeMultiplier = 2;

/** Base do `rem` do navegador: os tokens são em px e viram `rem` na web, para respeitar o zoom. */
const PX_POR_REM = 16;

const familiaNativa = { regular: fonts.regular, bold: fonts.bold } as const;
const pesoWeb = { regular: '500', bold: '700' } as const;

function rem(px: number): string {
  return `${px / PX_POR_REM}rem`;
}

/**
 * Estilo de texto pronto de um nível do DS, por plataforma.
 * Web: família com fallback, peso numérico e tamanhos em `rem`.
 * iPhone: família da Barlow carregada pelo `useFonts` e tamanhos em pontos.
 */
export function fonte(nivel: NivelFonte): TextStyle {
  const { size, line, weight } = type[nivel];
  if (Platform.OS === 'web') {
    // O react-native-web repassa strings como "1.0625rem" ao CSS; o tipo do RN só prevê número.
    return {
      fontFamily: fonts.fallbackWeb,
      fontWeight: pesoWeb[weight],
      fontSize: rem(size) as unknown as number,
      lineHeight: rem(line) as unknown as number,
    };
  }
  return { fontFamily: familiaNativa[weight], fontSize: size, lineHeight: line };
}
