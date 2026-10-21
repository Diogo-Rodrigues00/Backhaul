import { Platform, View, type TextStyle, type ViewStyle } from 'react-native';

import { rotuloUrgencia, type Urgencia } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { type, urgencyIcon } from '@/theme/tokens';

import { Icone } from './Icone';
import { Texto } from './Texto';
import { TextoOculto } from './TextoOculto';

export type TamanhoSelo = 'md' | 'lg';

export interface PropsSeloUrgencia {
  urgencia: Urgencia;
  /** `md` = 32 px (padrão); `lg` = 40 px (cartão de carga). */
  tamanho?: TamanhoSelo;
}

// DS seção 6: texto 15 px (lg: 17 px), peso 700, caixa alta, espaçamento 0,07 em.
const ESPACAMENTO_LETRAS_EM = 0.07;
// DS 5.1: o selo tem 32 px (md) ou 40 px (lg) de altura mínima; o ícone tem 1,35 em do texto.
const ALTURA_MINIMA: Record<TamanhoSelo, number> = { md: 32, lg: 40 };
const NIVEL_TEXTO = { md: 'sm', lg: 'base' } as const;
const FATOR_ICONE = 1.35;

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    selo: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingLeft: space[2],
      paddingRight: space[3],
      paddingVertical: space[1],
      borderWidth: border.width,
      borderRadius: radius.sm,
    } satisfies ViewStyle,
    texto: { textTransform: 'uppercase' } satisfies TextStyle,
  } as const;
}

/**
 * Selo de urgência (UrgencyBadge): o diferencial do produto. Sempre três sinais, nesta ordem de
 * importância: texto em caixa alta, forma (círculo, triângulo, octógono) e cor. Em escala de cinza
 * os três níveis continuam distintos. O leitor de tela lê "Urgência: Crítico".
 */
export function SeloUrgencia({ urgencia, tamanho = 'md' }: PropsSeloUrgencia) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  // Valor novo vindo da API (fora do enum) cai no visual neutro em vez de quebrar a lista.
  const nivel: Urgencia = urgencia in urgencyIcon ? urgencia : 'normal';
  const papel = colors.urgency[nivel];
  const corpo = type[NIVEL_TEXTO[tamanho]].size;

  return (
    <View
      // No iPhone, `accessible` junta o prefixo oculto e o texto numa só fala; na web o texto
      // oculto e o visível já são lidos em sequência, e `accessible` viraria um foco extra.
      accessible={Platform.OS !== 'web'}
      style={[
        estilos.selo,
        {
          minHeight: ALTURA_MINIMA[tamanho],
          backgroundColor: papel.bg,
          borderColor: papel.border,
        },
      ]}
    >
      <TextoOculto>Urgência: </TextoOculto>
      <Icone nome={urgencyIcon[nivel]} cor={papel.text} tamanho={Math.round(corpo * FATOR_ICONE)} />
      <Texto
        nivel={NIVEL_TEXTO[tamanho]}
        peso="bold"
        style={[estilos.texto, { color: papel.text, letterSpacing: corpo * ESPACAMENTO_LETRAS_EM }]}
      >
        {rotuloUrgencia(nivel)}
      </Texto>
    </View>
  );
}
