// Web: <svg> com uma linha tracejada (a cor vem do papel via CSS, que resolve a variável do tema).
import { useTema } from '@/state/tema/useTema';

import { corDoDivisor, medidasDivisor, type PropsDivisor } from './divisorComum';

export type { PropsDivisor, VarianteDivisor } from './divisorComum';

/** Divisor decorativo: faixa tracejada âmbar (cabeçalho) ou separador cinza. Não é lido. */
export function DivisorEstrada({ variante = 'cinza' }: PropsDivisor) {
  const { colors, border } = useTema();
  const { espessura, tracejado } = medidasDivisor(variante, border.widthStrong);

  return (
    <svg
      aria-hidden
      focusable="false"
      width="100%"
      height={espessura}
      style={{ display: 'block', flex: 'none', overflow: 'hidden' }}
    >
      <line
        x1={0}
        x2="100%"
        y1={espessura / 2}
        y2={espessura / 2}
        strokeWidth={espessura}
        strokeDasharray={tracejado}
        style={{ stroke: corDoDivisor(colors, variante) }}
      />
    </svg>
  );
}
