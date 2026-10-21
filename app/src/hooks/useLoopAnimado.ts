import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

/**
 * Valor animado que vai de 0 a 1 em loop, em `duracao` ms, enquanto `ativo` for `true`.
 * Quem chama passa `ativo = !movimentoReduzido` (ADR 0009): com movimento reduzido nada anima e o
 * valor fica em 0. Só `transform` e `opacity` devem usar este valor (DS 3.4).
 * Na web o `Animated` roda em JS (não há driver nativo); no iPhone, no driver nativo.
 */
export function useLoopAnimado(ativo: boolean, duracao: number): Animated.Value {
  // useState com função: o Animated.Value nasce uma vez e nunca é recriado.
  const [valor] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!ativo) {
      valor.setValue(0);
      return;
    }
    const animacao = Animated.loop(
      Animated.timing(valor, {
        toValue: 1,
        duration: duracao,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animacao.start();
    return () => animacao.stop();
  }, [ativo, duracao, valor]);

  return valor;
}
