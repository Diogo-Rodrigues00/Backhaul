// Rota origem → destino (RouteLine, DS 5.2). Os rótulos chegam prontos (`rotuloDoLocal`, card 007):
// a molécula não busca dados nem converte coordenadas.
import { Platform, View, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { correspondeBp, dataBp, useLargura } from '@/theme/responsivo';
import { border } from '@/theme/tokens';

export interface PropsLinhaRota {
  /** Rótulo do local de coleta, pronto (ex.: "Uberlândia - MG"). */
  origem: string;
  /** Rótulo do local de entrega, pronto (ex.: "Uberaba - MG"). */
  destino: string;
}

// Cada ponto tem uma largura mínima: dois pontos não cabem lado a lado em telas de até 420 px,
// então empilham sem depender de JavaScript na web (o traço some pela mesma regra de breakpoint).
const LARGURA_MINIMA_PONTO = 200;
const LARGURA_MINIMA_TRACO = 36;
const LARGURA_MAXIMA_TRACO = 120;

function criarEstilos({ colors, space: espaco }: TemaVisual) {
  return {
    rota: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: espaco[2],
    } satisfies ViewStyle,
    ponto: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: LARGURA_MINIMA_PONTO,
      gap: espaco[1],
    } satisfies ViewStyle,
    traco: {
      alignSelf: 'center',
      flexGrow: 1,
      minWidth: LARGURA_MINIMA_TRACO,
      maxWidth: LARGURA_MAXIMA_TRACO,
      height: 0,
      borderTopWidth: border.widthStrong,
      borderStyle: 'dashed',
      borderColor: colors.text.muted,
    } satisfies ViewStyle,
    tracoOculto: { display: 'none' } satisfies ViewStyle,
  } as const;
}

/** Coleta e entrega lado a lado; em até 420 px o traço some e os pontos empilham. */
export function LinhaRota({ origem, destino }: PropsLinhaRota) {
  const estilos = useEstilos(criarEstilos);
  const largura = useLargura();
  // Web: a regra do `dataSet` esconde o traço sem JavaScript. iPhone: decide pela largura da janela.
  const tracoOcultoNoIphone = Platform.OS !== 'web' && !correspondeBp('sem-compacto', largura);

  return (
    <View
      accessible={Platform.OS !== 'web'}
      accessibilityLabel={`Coleta em ${origem}, entrega em ${destino}`}
      style={estilos.rota}
    >
      <View style={estilos.ponto}>
        <Texto nivel="sm" cor="secundario">
          Coleta em
        </Texto>
        <Texto nivel="lg">{origem}</Texto>
      </View>
      <View
        aria-hidden
        dataSet={dataBp('sem-compacto')}
        style={[estilos.traco, tracoOcultoNoIphone && estilos.tracoOculto]}
      />
      <View style={estilos.ponto}>
        <Texto nivel="sm" cor="secundario">
          Entrega em
        </Texto>
        <Texto nivel="lg">{destino}</Texto>
      </View>
    </View>
  );
}
