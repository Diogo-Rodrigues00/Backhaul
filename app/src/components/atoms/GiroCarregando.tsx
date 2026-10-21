import { Animated, View } from 'react-native';

import { useLoopAnimado } from '@/hooks/useLoopAnimado';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';

import { Icone } from './Icone';

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
