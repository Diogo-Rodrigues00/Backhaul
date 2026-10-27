import { Animated, View, type DimensionValue, type ViewStyle } from 'react-native';

import { useLoopAnimado } from '@/hooks/useLoopAnimado';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { type } from '@/theme/tokens';

// DS 5.1: o brilho do esqueleto anda em 1,4 s. Sem degradê no React Native, o "brilho" é um pulso
// de opacidade (só opacity anima, DS 3.4), na mesma duração.
const PULSO_EM_MS = 1400;
const OPACIDADE_MINIMA = 0.5;

export interface PropsEsqueleto {
  /** Quantas linhas de texto simular (a última é mais curta). Padrão: 1. Ignorado se houver `altura`. */
  linhas?: number;
  /** Largura do bloco: número em px ou porcentagem. Padrão: 100%. */
  largura?: DimensionValue;
  /** Altura de um bloco (cartão, imagem). Sem ela, as linhas usam a altura do texto base. */
  altura?: number;
}

function criarEstilos({ colors, radius, space }: TemaVisual) {
  return {
    bloco: {
      backgroundColor: colors.border.subtle,
      borderRadius: radius.sm,
    } satisfies ViewStyle,
    pilha: { gap: space[2] } satisfies ViewStyle,
  } as const;
}

// Última linha mais curta, como um parágrafo de verdade.
const LARGURA_ULTIMA_LINHA: DimensionValue = '60%';

/**
 * Esqueleto de carregamento. Decorativo: `aria-hidden`; quem o usa coloca um `Carregando` (ou uma
 * região `role="status"` com texto) ao lado, que é o que o leitor de tela lê. Parado com
 * movimento reduzido.
 */
export function Esqueleto({ linhas = 1, largura = '100%', altura }: PropsEsqueleto) {
  const estilos = useEstilos(criarEstilos);
  const reduzido = useMovimentoReduzido();
  const pulso = useLoopAnimado(!reduzido, PULSO_EM_MS);
  const opacidade = pulso.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, OPACIDADE_MINIMA, 1],
  });

  const total = altura === undefined ? Math.max(1, Math.floor(linhas)) : 1;
  const alturaLinha = altura ?? type.base.size;
  const Bloco = reduzido ? View : Animated.View;

  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[estilos.pilha, { width: largura }]}
    >
      {Array.from({ length: total }, (_, indice) => (
        <Bloco
          key={indice}
          testID="esqueleto-bloco"
          style={[
            estilos.bloco,
            {
              height: alturaLinha,
              width: indice === total - 1 && total > 1 ? LARGURA_ULTIMA_LINHA : '100%',
            },
            reduzido ? null : { opacity: opacidade },
          ]}
        />
      ))}
    </View>
  );
}
