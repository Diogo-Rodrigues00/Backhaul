import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { correspondeBp, dataBp, useLargura, type NomeBp } from '@/theme/responsivo';

export interface PropsResponsivo {
  /** `so-barra` aparece só até 960 px; `sem-barra` só acima. Nomes em `theme/responsivo.ts`. */
  bp: NomeBp;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mostra ou esconde por largura sem JavaScript na web (ADR 0008): a View leva `data-bp` e o CSS
 * global esconde por `@media`, então o HTML estático já nasce certo e não há aviso de hidratação.
 * No iPhone não há CSS: a largura da janela decide e o conteúdo escondido nem é montado.
 */
export function Responsivo({ bp, children, style }: PropsResponsivo) {
  const largura = useLargura();
  if (Platform.OS !== 'web' && !correspondeBp(bp, largura)) return null;

  return (
    <View dataSet={dataBp(bp)} style={style}>
      {children}
    </View>
  );
}
