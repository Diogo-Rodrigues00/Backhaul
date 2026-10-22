import { Animated, View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { useLoopAnimado } from '@/hooks/useLoopAnimado';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { brand } from '@/theme/tokens';

// Protótipo (.road): faixa de 72 px, asfalto, traço âmbar de 36 px a cada 64 px e o caminhão ao centro.
const ALTURA = 72;
const PASSO = 64;
const TRACO = 36;
const ESPESSURA_TRACO = 6;
const VOLTA_EM_MS = 1100;
const LADO_CAMINHAO = 40;
const SALTO_CAMINHAO = 8;
// Mais traços do que cabem na coluna máxima (520 px): a faixa só desliza um passo e recomeça.
const QUANTIDADE_TRACOS = 14;
const TRACOS = Array.from({ length: QUANTIDADE_TRACOS }, (_, indice) => indice);

function criarEstilos({ colors, radius, border, space }: TemaVisual) {
  return {
    pista: {
      height: ALTURA,
      width: '100%',
      backgroundColor: colors.bg.inverse,
      borderRadius: radius.md,
      borderWidth: border.width,
      borderColor: colors.border.strong,
      overflow: 'hidden',
      justifyContent: 'center',
    } satisfies ViewStyle,
    faixa: {
      position: 'absolute',
      left: 0,
      flexDirection: 'row',
      gap: PASSO - TRACO,
    } satisfies ViewStyle,
    traco: {
      width: TRACO,
      height: ESPESSURA_TRACO,
      backgroundColor: brand.amber,
    } satisfies ViewStyle,
    centro: {
      ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
      alignItems: 'center',
      justifyContent: 'center',
    } satisfies ViewStyle,
    caminhao: {
      backgroundColor: colors.bg.inverse,
      paddingHorizontal: space[2],
      marginTop: -space[2],
    } satisfies ViewStyle,
  } as const;
}

/**
 * Estrada com caminhão da tela "Conectando ao servidor" (DS 5.1). Só decora: `aria-hidden`; o
 * texto da tela diz o que acontece. A faixa desliza e o caminhão balança (só `transform`); com
 * movimento reduzido tudo fica parado.
 */
export function EstradaAnimada() {
  const estilos = useEstilos(criarEstilos);
  const reduzido = useMovimentoReduzido();
  const volta = useLoopAnimado(!reduzido, VOLTA_EM_MS);
  const deslocamento = volta.interpolate({ inputRange: [0, 1], outputRange: [0, -PASSO] });
  const balanco = volta.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -SALTO_CAMINHAO, 0],
  });

  return (
    <View aria-hidden style={estilos.pista}>
      <Animated.View style={[estilos.faixa, { transform: [{ translateX: deslocamento }] }]}>
        {TRACOS.map((indice) => (
          <View key={indice} style={estilos.traco} />
        ))}
      </Animated.View>
      <View style={estilos.centro}>
        <Animated.View style={[estilos.caminhao, { transform: [{ translateY: balanco }] }]}>
          <Icone nome="truck" tamanho={LADO_CAMINHAO} cor={brand.amber} />
        </Animated.View>
      </View>
    </View>
  );
}
