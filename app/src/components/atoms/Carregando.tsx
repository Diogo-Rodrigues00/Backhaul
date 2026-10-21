import { View, type ViewStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { GiroCarregando, type PropsGiro } from './GiroCarregando';
import { Texto, type CorTexto } from './Texto';

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
