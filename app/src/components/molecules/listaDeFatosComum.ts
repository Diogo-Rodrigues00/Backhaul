import type { ReactNode } from 'react';

/** Um fato: rótulo curto ("Peso") e valor. Texto vira `Texto` em negrito; qualquer outra coisa (ex.: `Etiqueta`) é renderizada como está. */
export interface ItemDeFato {
  rotulo: string;
  valor: ReactNode;
}

export interface PropsListaDeFatos {
  itens: readonly ItemDeFato[];
}

/** Menor largura de um item na grade: abaixo disso, os itens empilham (320 px sem rolagem horizontal). */
export const LARGURA_MINIMA_ITEM = 150;
