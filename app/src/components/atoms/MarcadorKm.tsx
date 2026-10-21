import { Platform, View, type ViewStyle } from 'react-native';

import { formatarDistancia, SEM_VALOR, type NumeroEntrada } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { Texto } from './Texto';

export interface PropsMarcadorKm {
  /** Distância em km, como a API devolve (número ou texto numérico). */
  km: NumeroEntrada;
  /** Complemento da frase. Padrão: "até a coleta". */
  complemento?: string;
}

// DS 5.1 (KmMarker) e protótipo (.km): caixa de 40 px de altura mínima com borda asfalto de 2 px.
const ALTURA_MINIMA = 40;

function criarEstilos({ border, colors, radius, space }: TemaVisual) {
  return {
    caixa: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: space[2],
      minHeight: ALTURA_MINIMA,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderWidth: border.width,
      borderColor: colors.border.strong,
      borderRadius: radius.md,
      backgroundColor: colors.bg.surface,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Marcador de distância (KmMarker): "12,4 km até a coleta". Recebe o número e formata com
 * `formatarDistancia`; a frase completa fica no texto, não só o número (DS 5.1).
 * Sem distância válida não renderiza nada (nunca mostra "— até a coleta").
 */
export function MarcadorKm({ km, complemento = 'até a coleta' }: PropsMarcadorKm) {
  const estilos = useEstilos(criarEstilos);
  const distancia = formatarDistancia(km);
  if (distancia === SEM_VALOR) return null;

  return (
    <View accessible={Platform.OS !== 'web'} style={estilos.caixa}>
      <Texto nivel="lg" numerico>
        {distancia}
      </Texto>
      <Texto nivel="sm">{complemento}</Texto>
    </View>
  );
}
