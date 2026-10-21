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

// Até 420 px: o traço some e um separador de largura total (`quebra`) empurra o destino para a
// linha de baixo. Os dois usam o mesmo ponto de quebra (`compacto`), então o critério é um só.
// Acima de 420 px os pontos encolhem até o mínimo e o traço fica entre eles, na mesma linha.
const LARGURA_MINIMA_PONTO = 120;
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
    quebra: { width: '100%', height: 0 } satisfies ViewStyle,
    oculto: { display: 'none' } satisfies ViewStyle,
  } as const;
}

/** Coleta e entrega lado a lado; em até 420 px o traço some e o destino vai para a linha de baixo. */
export function LinhaRota({ origem, destino }: PropsLinhaRota) {
  const estilos = useEstilos(criarEstilos);
  const largura = useLargura();
  const iphone = Platform.OS !== 'web';
  // Web: a regra do `dataSet` decide sem JavaScript. iPhone: a mesma regra, pela largura da janela.
  const tracoOculto = iphone && !correspondeBp('sem-compacto', largura);
  const quebraOculta = iphone && !correspondeBp('so-compacto', largura);

  return (
    <View
      // O nome do grupo só vai ao iPhone. Na web o texto visível já é lido na ordem certa e
      // `aria-label` num `<div>` sem papel é proibido pelo axe (aria-prohibited-attr).
      accessible={iphone}
      accessibilityLabel={iphone ? `Coleta em ${origem}, entrega em ${destino}` : undefined}
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
        style={[estilos.traco, tracoOculto && estilos.oculto]}
      />
      <View
        aria-hidden
        dataSet={dataBp('so-compacto')}
        style={[estilos.quebra, quebraOculta && estilos.oculto]}
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
