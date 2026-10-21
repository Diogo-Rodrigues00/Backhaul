// Andamento do frete (Stepper, DS 5.2): Aceito · Em trânsito · Entregue.
// Concluída, atual e pendente têm ícone e texto oculto; nunca só cor. A atual leva `aria-current`.
import { Platform, View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import { TextoOculto } from '@/components/atoms/TextoOculto';
import { rotuloStatusEntrega, type StatusEntrega } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsAndamentoFrete {
  /** Status de entrega do frete. `cancelado` não tem etapa: todas as etapas saem pendentes. */
  statusEntrega: StatusEntrega;
}

type EtapaFrete = Exclude<StatusEntrega, 'cancelado'>;
type EstadoEtapa = 'concluida' | 'atual' | 'pendente';

const ETAPAS: readonly EtapaFrete[] = ['aceito', 'em_transito', 'entregue'];

const SUFIXO_OCULTO: Record<EstadoEtapa, string> = {
  concluida: ' (concluído)',
  atual: ' (etapa atual)',
  pendente: ' (pendente)',
};

const ICONE: Record<EstadoEtapa, NomeIcone> = {
  concluida: 'check',
  atual: 'truck',
  pendente: 'circle',
};

// Medida do protótipo (.stepper__dot) que a escala do DS não cobre: bolinha de 40 px.
const TAMANHO_BOLINHA = 40;

function criarEstilos({ border: borda, space: espaco }: TemaVisual) {
  return {
    lista: { flexDirection: 'row' } satisfies ViewStyle,
    etapa: {
      flex: 1,
      alignItems: 'center',
      gap: espaco[1],
      position: 'relative',
    } satisfies ViewStyle,
    // Metade do conector fica sobre a etapa anterior e metade sobre esta; a bolinha cobre o centro.
    conector: {
      position: 'absolute',
      top: TAMANHO_BOLINHA / 2 - borda.widthStrong / 2,
      left: '-50%',
      width: '100%',
      borderTopWidth: borda.widthStrong,
    } satisfies ViewStyle,
    bolinha: {
      zIndex: 1,
      width: TAMANHO_BOLINHA,
      height: TAMANHO_BOLINHA,
      borderRadius: TAMANHO_BOLINHA / 2,
      borderWidth: borda.widthStrong,
      alignItems: 'center',
      justifyContent: 'center',
    } satisfies ViewStyle,
    textoEtapa: { textAlign: 'center' } as const,
  } as const;
}

/** Andamento do frete: a etapa atual vem por `aria-current` (web) e pelo texto oculto. */
export function AndamentoFrete({ statusEntrega }: PropsAndamentoFrete) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const indiceAtual = ETAPAS.indexOf(statusEntrega as EtapaFrete);

  const aparencia: Record<
    EstadoEtapa,
    { fundo: string; borda: string; icone: string; texto: 'primario' | 'secundario' }
  > = {
    concluida: {
      fundo: colors.success.fill,
      borda: colors.success.fill,
      icone: colors.success.onFill,
      texto: 'primario',
    },
    atual: {
      fundo: colors.action.fill,
      borda: colors.action.border,
      icone: colors.action.onFill,
      texto: 'primario',
    },
    pendente: {
      fundo: colors.bg.surface,
      borda: colors.border.control,
      icone: colors.text.muted,
      texto: 'secundario',
    },
  };

  return (
    <View role="list" accessibilityLabel="Andamento do frete" style={estilos.lista}>
      {ETAPAS.map((etapa, indice) => {
        const estado: EstadoEtapa =
          indice < indiceAtual ? 'concluida' : indice === indiceAtual ? 'atual' : 'pendente';
        const visual = aparencia[estado];
        // O conector que chega à etapa é sólido até a atual (DS 5.2), tracejado depois.
        const conectorSolido = indice > 0 && indice <= indiceAtual;
        return (
          <View
            key={etapa}
            role="listitem"
            aria-current={estado === 'atual' ? 'step' : undefined}
            accessible={Platform.OS !== 'web'}
            style={estilos.etapa}
          >
            {indice > 0 ? (
              <View
                aria-hidden
                style={[
                  estilos.conector,
                  {
                    borderTopColor: conectorSolido ? colors.text.primary : colors.border.control,
                    borderStyle: conectorSolido ? 'solid' : 'dashed',
                  },
                ]}
              />
            ) : null}
            <View
              style={[
                estilos.bolinha,
                { backgroundColor: visual.fundo, borderColor: visual.borda },
              ]}
            >
              <Icone nome={ICONE[estado]} cor={visual.icone} />
            </View>
            <Texto nivel="sm" peso="bold" cor={visual.texto} style={estilos.textoEtapa}>
              {rotuloStatusEntrega(etapa)}
            </Texto>
            <TextoOculto>{SUFIXO_OCULTO[estado]}</TextoOculto>
          </View>
        );
      })}
    </View>
  );
}
