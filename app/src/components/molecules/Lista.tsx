import type { Key, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export interface PropsLista<T> {
  itens: readonly T[];
  /** Chave estável do item (o `id` da API): o polling nunca remonta a lista nem move o foco. */
  chave: (item: T) => Key;
  renderizarItem: (item: T, indice: number) => ReactNode;
  /** Nome da lista para o leitor de tela ("Cargas próximas"). */
  rotulo: string;
}

function criarEstilos({ space }: TemaVisual) {
  return { lista: { gap: space[4] } satisfies ViewStyle } as const;
}

/**
 * Lista com semântica de verdade (`role="list"` e `listitem`; vira `<ul>`/`<li>` na web). Usa
 * `.map`, não `FlatList`: as listas do MVP são curtas e a `FlatList` perde a semântica na web
 * (ADR 0009). A ordem é a da API; o front não reordena.
 */
export function Lista<T>({ itens, chave, renderizarItem, rotulo }: PropsLista<T>) {
  const estilos = useEstilos(criarEstilos);

  return (
    <View role="list" aria-label={rotulo} style={estilos.lista}>
      {itens.map((item, indice) => (
        <View key={chave(item)} role="listitem">
          {renderizarItem(item, indice)}
        </View>
      ))}
    </View>
  );
}
