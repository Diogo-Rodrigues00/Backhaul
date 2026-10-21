// iPhone: react-native-svg com os mesmos paths de icones.ts. Este arquivo nunca entra no bundle web.
import { createElement, type ComponentType } from 'react';
import { PixelRatio } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useTema } from '@/state/tema/useTema';
import { maxFontSizeMultiplier } from '@/theme/tipografia';

import {
  ESPESSURA_ICONE,
  VIEWBOX_ICONE,
  tamanhoEmPx,
  type PropsDesenho,
  type PropsIcone,
} from './iconeComum';
import { icones } from './icones';

export type { PropsDesenho, PropsIcone, TamanhoIcone } from './iconeComum';

const COMPONENTES = {
  path: Path,
  circle: Circle,
  rect: Rect,
  line: Line,
  polyline: Polyline,
} as const;

export function Desenho({
  formas,
  tamanho = 'padrao',
  cor,
  rotulo,
  viewBox = VIEWBOX_ICONE,
  espessura = ESPESSURA_ICONE,
}: PropsDesenho) {
  const { colors } = useTema();
  // Dynamic Type: o desenho acompanha o texto, no máximo 2x (mesmo teto do `Texto`).
  const escala = Math.min(PixelRatio.getFontScale(), maxFontSizeMultiplier);
  const lado = tamanhoEmPx(tamanho, escala);
  const traco = cor ?? colors.text.primary;
  const acessivel = rotulo
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: rotulo }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

  return (
    <Svg
      viewBox={viewBox}
      width={lado}
      height={lado}
      fill="none"
      stroke={traco}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...acessivel}
    >
      {formas.map(([tag, atributos], indice) =>
        createElement(COMPONENTES[tag] as unknown as ComponentType<typeof atributos>, {
          key: indice,
          ...atributos,
        }),
      )}
    </Svg>
  );
}

export function Icone({ nome, ...resto }: PropsIcone) {
  return <Desenho formas={icones[nome]} {...resto} />;
}
