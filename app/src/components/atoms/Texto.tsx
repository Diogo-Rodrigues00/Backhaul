import { useMemo, type Ref } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { fonte, maxFontSizeMultiplier, type NivelFonte, type PesoFonte } from '@/theme/tipografia';

import { CORES_TEXTO, corDoTexto, type CorTexto } from './corTexto';

export type { CorTexto } from './corTexto';

export interface PropsTexto extends TextProps {
  /** Nível da escala tipográfica (`type` do DS). Padrão: `base` (17/26). */
  nivel?: NivelFonte;
  /** Troca o peso do nível (500 ou 700). */
  peso?: PesoFonte;
  /** Papel de cor do DS. Padrão: `primario`. */
  cor?: CorTexto;
  /** Valores (R$, km, kg): algarismos tabulares na web. */
  numerico?: boolean;
  ref?: Ref<Text>;
}

function criarEstilos({ colors }: TemaVisual) {
  return Object.fromEntries(
    CORES_TEXTO.map((cor) => [cor, { color: corDoTexto(colors, cor) }]),
  ) as Record<CorTexto, TextStyle>;
}

// Constante, para não recriar o objeto a cada render. Vira `data-num` e liga os algarismos tabulares.
const ATRIBUTOS_NUMERICOS: Readonly<Record<string, string>> = { num: '' };

/**
 * Texto do design system: família Barlow, tamanhos de `type` (via `fonte()`), cor por papel e
 * Dynamic Type até 2x. Todo texto do app passa por aqui (ou por `Titulo`).
 */
export function Texto({
  nivel = 'base',
  peso,
  cor = 'primario',
  numerico = false,
  style,
  ...resto
}: PropsTexto) {
  const estilos = useEstilos(criarEstilos);
  const tipografia = useMemo(() => fonte(nivel, peso), [nivel, peso]);

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      dataSet={numerico ? ATRIBUTOS_NUMERICOS : undefined}
      {...resto}
      style={[tipografia, estilos[cor], style]}
    />
  );
}
