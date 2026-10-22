// Casca do SeletorLocal (card 018), igual na web e no iPhone: o local escolhido com "Trocar", o
// botão "Usar minha localização" (GpsButton do DS) e o aviso de GPS. A busca de cidade, que muda por
// plataforma, entra como `children`.
import type { ReactNode, RefObject } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { Banner } from '@/components/molecules/Banner';
import { LinhaErro } from '@/components/molecules/campoComum';
import { useEstilos } from '@/state/tema/useEstilos';
import type { TemaVisual } from '@/state/tema/montarTema';

import {
  TEXTO_GPS_CARREGANDO,
  TEXTO_GPS_FALHA,
  TEXTO_GPS_FALHA_APOIO,
  TEXTO_GPS_NEGADO_APOIO,
  type EstadoGps,
  type Local,
} from './SeletorLocal.logica';

export interface PropsCascaSeletorLocal {
  id: string;
  rotulo: string;
  valor: Local | null;
  permitirGps: boolean;
  erro?: string;
  gps: EstadoGps;
  aoUsarGps: () => void;
  aoTrocar: () => void;
  refTrocar: RefObject<never>;
  /** Campo de busca e resultados (só aparecem quando ainda não há local escolhido). */
  children: ReactNode;
}

function criarEstilos({ space }: TemaVisual) {
  return {
    grupo: { gap: space[3], minWidth: 0 } satisfies ViewStyle,
    escolhido: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    } satisfies ViewStyle,
    texto: { flexShrink: 1, minWidth: 0 } satisfies ViewStyle,
    gps: { gap: space[2], alignItems: 'flex-start' } satisfies ViewStyle,
  } as const;
}

const AJUDA_GPS = Platform.select({
  web: 'O navegador vai pedir sua permissão. Se preferir, escolha a cidade abaixo.',
  default: 'O iPhone vai pedir sua permissão. Se preferir, escolha a cidade abaixo.',
});

export function CascaSeletorLocal({
  id,
  rotulo,
  valor,
  permitirGps,
  erro,
  gps,
  aoUsarGps,
  aoTrocar,
  refTrocar,
  children,
}: PropsCascaSeletorLocal) {
  const estilos = useEstilos(criarEstilos);
  const idRotulo = `${id}-grupo`;

  // Com GPS (ou com o local já escolhido) há mais de um controle: o grupo dá o contexto a todos.
  const agrupar = permitirGps || valor !== null;

  return (
    <View
      role={agrupar ? 'group' : undefined}
      aria-labelledby={agrupar ? idRotulo : undefined}
      accessibilityLabel={agrupar ? rotulo : undefined}
      style={estilos.grupo}
    >
      {agrupar ? (
        <Texto nativeID={idRotulo} peso="bold">
          {rotulo}
        </Texto>
      ) : null}

      {valor ? (
        <>
          {valor.origem === 'gps' ? (
            <Banner variante="ok" titulo="Localização obtida">
              Usamos a posição do seu aparelho.
            </Banner>
          ) : null}
          <View style={estilos.escolhido}>
            <Texto style={estilos.texto} peso="bold">{`Selecionado: ${valor.rotulo}`}</Texto>
            <Botao variante="secundario" aoPressionar={aoTrocar} ref={refTrocar}>
              Trocar
            </Botao>
          </View>
          {erro ? <LinhaErro nativeID={`${id}-erro-escolhido`}>{erro}</LinhaErro> : null}
        </>
      ) : (
        <>
          {permitirGps ? (
            <View style={estilos.gps}>
              <Botao
                variante="secundario"
                icone="locate"
                carregando={gps.situacao === 'carregando'}
                rotuloCarregando={TEXTO_GPS_CARREGANDO}
                aoPressionar={aoUsarGps}
              >
                Usar minha localização
              </Botao>
              <Texto nivel="sm" cor="secundario">
                {AJUDA_GPS}
              </Texto>
            </View>
          ) : null}
          {gps.situacao === 'falha' ? (
            <Banner variante="aviso" titulo={TEXTO_GPS_FALHA}>
              {gps.motivo === 'negado' ? TEXTO_GPS_NEGADO_APOIO : TEXTO_GPS_FALHA_APOIO}
            </Banner>
          ) : null}
          {children}
        </>
      )}
    </View>
  );
}
