import { View, type ViewStyle } from 'react-native';

import { DivisorEstrada } from '@/components/atoms/DivisorEstrada';
import { Desenho } from '@/components/atoms/Icone';
import type { Forma } from '@/components/atoms/icones';
import { simbolo, VIEWBOX_SIMBOLO } from '@/components/atoms/simbolo';
import { Texto } from '@/components/atoms/Texto';
import { Responsivo } from '@/components/molecules/Responsivo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { brand, colors } from '@/theme/tokens';

const LADO_SIMBOLO = 56;
const LARGURA_ESTRADA = 360;
// Tons fixos das placas, tirados dos tokens do tema claro: o painel é asfalto nos dois temas.
const CLARO = colors.light.text.onInverse;
const PLACA_CINZA = colors.light.urgency.normal.bg;
const PLACA_VERMELHA = colors.light.urgency.critico.bg;
const BRANCO = colors.light.urgency.critico.text;

// Três placas de trânsito (protótipo, AuthHero): regulamentação, advertência e pare. Decorativas;
// as cores são as da marca e iguais nos dois temas, porque o painel é sempre asfalto.
const VIEWBOX_PLACA = '0 0 96 96';
const LADO_PLACA = 88;
const PLACAS: readonly (readonly Forma[])[] = [
  [
    ['circle', { cx: 48, cy: 48, r: 36, fill: PLACA_CINZA, stroke: CLARO, strokeWidth: 4 }],
    ['circle', { cx: 48, cy: 48, r: 12, fill: 'none', stroke: brand.asphalt, strokeWidth: 6 }],
  ],
  [
    ['path', { d: 'M48 10 88 80H8Z', fill: brand.amber, stroke: brand.asphalt, strokeWidth: 4 }],
    ['path', { d: 'M48 36v20', stroke: brand.asphalt, strokeWidth: 6 }],
    ['circle', { cx: 48, cy: 68, r: 3.5, fill: brand.asphalt, stroke: 'none' }],
  ],
  [
    [
      'path',
      {
        d: 'M34 8h28l26 26v28L62 88H34L8 62V34Z',
        fill: PLACA_VERMELHA,
        stroke: CLARO,
        strokeWidth: 4,
      },
    ],
    ['path', { d: 'M48 30v22', stroke: BRANCO, strokeWidth: 6 }],
    ['circle', { cx: 48, cy: 66, r: 3.5, fill: BRANCO, stroke: 'none' }],
  ],
];

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    painel: {
      // Metade da largura lado a lado; abaixo de ~900 px o `flex-wrap` do template empilha.
      flexGrow: 5,
      flexShrink: 1,
      flexBasis: 450,
      minWidth: 0,
      justifyContent: 'center',
      gap: space[5],
      paddingVertical: space[8],
      paddingHorizontal: space[6],
      backgroundColor: colors.bg.inverse,
    } satisfies ViewStyle,
    marca: { flexDirection: 'row', alignItems: 'center', gap: space[3] } satisfies ViewStyle,
    frase: { maxWidth: 480 } satisfies ViewStyle,
    estrada: { width: '100%', maxWidth: LARGURA_ESTRADA } satisfies ViewStyle,
    placas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[6] } satisfies ViewStyle,
  } as const;
}

/**
 * Painel da marca das telas de autenticação (AuthHero, DS 5.3): fundo asfalto, símbolo e nome,
 * a chamada do produto, três placas e a faixa tracejada. É decorativo: fica fora da árvore de
 * acessibilidade (`aria-hidden`) e a chamada é um parágrafo, porque o `h1` da tela é "Entrar".
 * As placas só aparecem acima de 720 px, para o formulário ficar perto do topo no celular.
 */
export function PainelMarca() {
  const estilos = useEstilos(criarEstilos);

  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" style={estilos.painel}>
      <View style={estilos.marca}>
        <Desenho formas={simbolo} viewBox={VIEWBOX_SIMBOLO} tamanho={LADO_SIMBOLO} />
        <Texto nivel="xl" peso="bold" cor="sobreInverso" style={MARCA}>
          Backhaul
        </Texto>
      </View>
      <View style={estilos.frase}>
        <Texto nivel="3xl" peso="bold" cor="sobreInverso">
          {'A urgência decide '}
          <Texto nivel="3xl" peso="bold" style={DESTAQUE}>
            quem sai na frente.
          </Texto>
        </Texto>
      </View>
      <View style={estilos.frase}>
        <Texto nivel="lg" peso="regular" cor="sobreInversoDiscreto">
          Carga com prazo curto aparece primeiro para o motorista que está livre perto dela.
        </Texto>
      </View>
      <Responsivo bp="sem-celular" style={estilos.placas}>
        {PLACAS.map((formas, indice) => (
          <Desenho key={indice} formas={formas} viewBox={VIEWBOX_PLACA} tamanho={LADO_PLACA} />
        ))}
      </Responsivo>
      <View style={estilos.estrada}>
        <DivisorEstrada variante="ambar" />
      </View>
    </View>
  );
}

const MARCA = { textTransform: 'uppercase', letterSpacing: 2 } as const;
const DESTAQUE = { color: brand.amber } as const;
