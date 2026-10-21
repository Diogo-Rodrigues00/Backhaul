// iPhone: react-native-svg com a mesma linha tracejada. Nunca entra no bundle web.
import Svg, { Line } from 'react-native-svg';

import { useTema } from '@/state/tema/useTema';

import { corDoDivisor, medidasDivisor, type PropsDivisor } from './divisorComum';

export type { PropsDivisor, VarianteDivisor } from './divisorComum';

/** Divisor decorativo: faixa tracejada âmbar (cabeçalho) ou separador cinza. Não é lido. */
export function DivisorEstrada({ variante = 'cinza' }: PropsDivisor) {
  const { colors, border } = useTema();
  const { espessura, tracejado } = medidasDivisor(variante, border.widthStrong);

  return (
    <Svg
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      width="100%"
      height={espessura}
    >
      <Line
        x1={0}
        x2="100%"
        y1={espessura / 2}
        y2={espessura / 2}
        strokeWidth={espessura}
        strokeDasharray={tracejado}
        stroke={corDoDivisor(colors, variante)}
      />
    </Svg>
  );
}
