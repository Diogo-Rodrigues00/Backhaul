import { Animated, View, type ViewStyle } from 'react-native';

import { useLoopAnimado } from '@/hooks/useLoopAnimado';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { Icone } from './Icone';
import { Texto, type CorTexto } from './Texto';

export type TamanhoCarregando = 'pequeno' | 'grande';

// DS seção 5.1: spinner pequeno cabe no botão (acompanha o corpo do texto); o grande tem 44 px
// (protótipo, `.spinner-lg`).
const LADO_GRANDE = 44;
const VOLTA_EM_MS = 1000;

export interface PropsGiro {
  tamanho?: TamanhoCarregando;
  /** Cor do traço (papel do tema). Padrão: herda a do texto (web) ou `text.primary`. */
  cor?: string;
}

/**
 * Só o ícone girando. Parado com movimento reduzido (o texto ao lado continua dizendo o que
 * acontece). Não use sozinho: o DS pede sempre texto junto; o botão em carregamento já tem o rótulo.
 */
export function GiroCarregando({ tamanho = 'pequeno', cor }: PropsGiro) {
  const reduzido = useMovimentoReduzido();
  const volta = useLoopAnimado(!reduzido, VOLTA_EM_MS);
  const rotacao = volta.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const icone = (
    <Icone nome="loader" tamanho={tamanho === 'grande' ? LADO_GRANDE : 'padrao'} cor={cor} />
  );

  if (reduzido) {
    return <View aria-hidden>{icone}</View>;
  }
  return (
    <Animated.View aria-hidden style={{ transform: [{ rotate: rotacao }] }}>
      {icone}
    </Animated.View>
  );
}

export interface PropsCarregando extends PropsGiro {
  /** Frase do estado, sempre visível: "Carregando cargas…". */
  texto: string;
  /** Cor do texto. Padrão: texto principal. */
  corTexto?: CorTexto;
}

function criarEstilos({ space }: TemaVisual) {
  return {
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    } satisfies ViewStyle,
    linhaGrande: { flexDirection: 'column', gap: space[3] } satisfies ViewStyle,
  } as const;
}

/**
 * Spinner do DS: ícone girando + texto, nunca o ícone sozinho. `role="status"` e `aria-busy`
 * anunciam o estado sem mover o foco.
 */
export function Carregando({ texto, tamanho = 'pequeno', cor, corTexto }: PropsCarregando) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View
      role="status"
      aria-live="polite"
      aria-busy
      style={tamanho === 'grande' ? [estilos.linha, estilos.linhaGrande] : estilos.linha}
    >
      <GiroCarregando tamanho={tamanho} cor={cor} />
      <Texto cor={corTexto}>{texto}</Texto>
    </View>
  );
}
