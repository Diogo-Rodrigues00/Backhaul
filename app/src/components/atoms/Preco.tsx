import { View } from 'react-native';

import { formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { Texto } from './Texto';

export interface PropsPreco {
  /** Valor como a API devolve (número ou texto numérico). Nunca calcule comissão aqui. */
  valor: NumeroEntrada;
  /** Legenda pequena acima do valor ("Valor oferecido"). */
  rotulo?: string;
  /** Carga/proposta vencida: o valor perde o destaque laranja (DS 5.1). */
  expirado?: boolean;
}

function criarEstilos({ space }: TemaVisual) {
  return { coluna: { gap: space[1] } } as const;
}

/**
 * Preço (Price): `R$ 3.500,00` em 30 px, `text.accent` e algarismos tabulares (D-PO-12). Expirado
 * usa `text.secondary`. O formato vem de `formatarMoeda`; nada de `toFixed` ou "R$" na mão.
 */
export function Preco({ valor, rotulo, expirado = false }: PropsPreco) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.coluna}>
      {rotulo ? (
        <Texto nivel="sm" cor="secundario">
          {rotulo}
        </Texto>
      ) : null}
      <Texto nivel="2xl" numerico cor={expirado ? 'secundario' : 'destaque'}>
        {formatarMoeda(valor)}
      </Texto>
    </View>
  );
}
