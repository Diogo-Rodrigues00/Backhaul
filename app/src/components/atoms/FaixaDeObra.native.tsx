// iPhone: a mesma faixa de obra em react-native-svg (o gradiente CSS não existe no nativo).
import Svg, { Defs, G, Line, Pattern, Rect } from 'react-native-svg';

import { brand } from '@/theme/tokens';

import { ALTURA_FAIXA_OBRA, LARGURA_LISTRA } from './faixaComum';

// Mosaico quadrado cuja diagonal repete a cada 24 px (12 asfalto + 12 âmbar), como o gradiente a
// 135° da web: o lado é 24 · √2 e as listras seguem as retas x + y = 0, L e 2L.
const LADO = LARGURA_LISTRA * 2 * Math.SQRT2;

/** Faixa de obra do cartão crítico (DS 6): 12 px de altura. Decorativa: não é lida. */
export function FaixaDeObra() {
  return (
    <Svg
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      width="100%"
      height={ALTURA_FAIXA_OBRA}
    >
      <Defs>
        <Pattern id="obra" width={LADO} height={LADO} patternUnits="userSpaceOnUse">
          <Rect width={LADO} height={LADO} fill={brand.asphalt} />
          <G stroke={brand.amber} strokeWidth={LARGURA_LISTRA}>
            <Line x1={-LADO} y1={LADO} x2={LADO} y2={-LADO} />
            <Line x1={0} y1={LADO} x2={LADO} y2={0} />
            <Line x1={0} y1={LADO * 2} x2={LADO * 2} y2={0} />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height={ALTURA_FAIXA_OBRA} fill="url(#obra)" />
    </Svg>
  );
}
