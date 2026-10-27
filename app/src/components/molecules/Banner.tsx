import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export type VarianteBanner = 'info' | 'ok' | 'aviso' | 'erro';

export interface PropsBanner {
  variante: VarianteBanner;
  /** Frase curta em destaque (negrito). */
  titulo?: string;
  /** Texto de apoio. */
  children?: string;
  /** Botão ou link opcional, no fim do banner. */
  acao?: ReactNode;
  /**
   * `false`: o banner é só texto na tela, sem `role` nem região viva (conteúdo que muda sozinho e
   * não deve ser anunciado a cada mudança, como o contador de tentativas). Padrão: `true`.
   */
  anunciar?: boolean;
}

const ICONE: Record<VarianteBanner, NomeIcone> = {
  info: 'info',
  ok: 'check',
  aviso: 'triangle-alert',
  erro: 'octagon-alert',
};

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    texto: { flex: 1, flexShrink: 1, minWidth: 0, gap: space[1] } satisfies ViewStyle,
    acao: { marginTop: space[2], alignItems: 'flex-start' } satisfies ViewStyle,
  } as const;
}

/**
 * Banner (DS 5.2 e 7): ícone + título + texto (+ ação), borda de 2 px; o sinal nunca é só a cor.
 * `erro` é `role="alert"` (anuncia na hora); `info`, `ok` e `aviso` são `role="status"` (educado).
 */
export function Banner({ variante, titulo, children, acao, anunciar = true }: PropsBanner) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();

  const cores = {
    info: { fundo: colors.info.bg, borda: colors.info.text, icone: colors.info.text },
    ok: { fundo: colors.success.bg, borda: colors.success.text, icone: colors.success.text },
    aviso: { fundo: colors.bg.highlight, borda: colors.text.primary, icone: colors.text.accent },
    erro: { fundo: colors.error.bg, borda: colors.error.border, icone: colors.error.text },
  }[variante];

  return (
    <View
      role={anunciar ? (variante === 'erro' ? 'alert' : 'status') : undefined}
      aria-live={anunciar ? undefined : 'off'}
      style={[estilos.banner, { backgroundColor: cores.fundo, borderColor: cores.borda }]}
    >
      <Icone nome={ICONE[variante]} tamanho="destaque" cor={cores.icone} />
      <View style={estilos.texto}>
        {titulo ? <Texto peso="bold">{titulo}</Texto> : null}
        {children ? <Texto>{children}</Texto> : null}
        {acao ? <View style={estilos.acao}>{acao}</View> : null}
      </View>
    </View>
  );
}
