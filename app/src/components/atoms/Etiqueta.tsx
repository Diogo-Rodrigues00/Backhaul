import { Platform, View, type ViewStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { Icone } from './Icone';
import type { NomeIcone } from './icones';
import { Texto, type CorTexto } from './Texto';
import { corDoTexto } from './corTexto';

export type VarianteEtiqueta = 'neutro' | 'ok' | 'erro' | 'info' | 'novo' | 'tracejada';

export interface PropsEtiqueta {
  /** Texto do status ("Aberta", "Pendente", "Expirada"). */
  children: string;
  variante?: VarianteEtiqueta;
  /** Ícone ao lado do texto. Toda etiqueta tem ícone + texto; sem este, usa o da variante. */
  icone?: NomeIcone;
}

// Ícone padrão por variante (DS 5.1: "sempre ícone + texto"): sinal que não depende de cor.
// O protótipo usa `flask` na etiqueta "Exige MOPP" (variante info): o designer deve confirmar se o
// padrão da variante é `info`; quem precisa do `flask` passa `icone="flask"`.
const ICONE_PADRAO: Record<VarianteEtiqueta, NomeIcone> = {
  neutro: 'clock',
  ok: 'check',
  erro: 'x',
  info: 'info',
  novo: 'bell',
  tracejada: 'clock',
};

const COR_DO_TEXTO: Record<VarianteEtiqueta, CorTexto> = {
  neutro: 'primario',
  ok: 'sucesso',
  erro: 'erro',
  info: 'info',
  novo: 'sobreAcao',
  tracejada: 'secundario',
};

// Medidas do protótipo (.tag) que a escala do DS não cobre: altura mínima e borda de 1,5 px.
const ALTURA_MINIMA = 28;
const LARGURA_BORDA = 1.5;

function criarEstilos({ radius, space }: TemaVisual) {
  return {
    etiqueta: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: ALTURA_MINIMA,
      paddingLeft: space[2],
      paddingRight: space[3],
      borderWidth: LARGURA_BORDA,
      borderRadius: radius.pill,
    } satisfies ViewStyle,
    tracejada: { borderStyle: 'dashed' } satisfies ViewStyle,
    texto: { flexShrink: 1 } as const,
  } as const;
}

/**
 * Etiqueta de status (StatusTag): pílula com ícone + texto, nunca só cor. O texto pode quebrar de
 * linha (nunca é cortado).
 */
export function Etiqueta({ children, variante = 'neutro', icone }: PropsEtiqueta) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const cor = COR_DO_TEXTO[variante];

  const fundo = {
    neutro: colors.bg.sunken,
    ok: colors.success.bg,
    erro: colors.error.bg,
    info: colors.info.bg,
    novo: colors.action.fill,
    tracejada: 'transparent',
  }[variante];
  const borda = {
    neutro: colors.border.control,
    ok: colors.success.text,
    erro: colors.error.border,
    info: colors.info.text,
    novo: colors.action.border,
    tracejada: colors.border.control,
  }[variante];

  return (
    <View
      accessible={Platform.OS !== 'web'}
      style={[
        estilos.etiqueta,
        variante === 'tracejada' && estilos.tracejada,
        { backgroundColor: fundo, borderColor: borda },
      ]}
    >
      <Icone nome={icone ?? ICONE_PADRAO[variante]} cor={corDoTexto(colors, cor)} />
      <Texto nivel="sm" peso="bold" cor={cor} style={estilos.texto}>
        {children}
      </Texto>
    </View>
  );
}
