import { Animated, View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { useLoopAnimado } from '@/hooks/useLoopAnimado';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { formatarHoraCompleta, type DataEntrada } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { motion } from '@/theme/tokens';

export interface PropsBarraNovidades {
  /** Novidade do último ciclo ("1 nova proposta"). Vazio: a barra só mostra o aviso fixo. */
  titulo?: string;
  /** Hora da última atualização (`dataUpdatedAt` da consulta). */
  atualizadoEm?: DataEntrada | number;
  /** Intervalo do polling em segundos. Padrão: o do DS/ADR 0010 (`motion.pollingMs`). */
  intervaloSegundos?: number;
}

const LADO_PONTO = 12;
const PULSO_EM_MS = 1600;
const OPACIDADE_MINIMA = 0.3;

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    texto: { flex: 1, flexShrink: 1, minWidth: 0 } satisfies ViewStyle,
    ponto: {
      width: LADO_PONTO,
      height: LADO_PONTO,
      borderRadius: radius.pill,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Barra de novidades (LiveBar): sino, a novidade, o aviso de que a tela atualiza sozinha e um ponto
 * que pulsa (parado com movimento reduzido). Só a novidade fica na região `role="status"` educada:
 * a hora muda a cada ciclo e, dentro da região, seria lida a cada 10 s. Nunca move o foco (CT-09).
 */
export function BarraNovidades({
  titulo,
  atualizadoEm,
  intervaloSegundos = motion.pollingMs / 1000,
}: PropsBarraNovidades) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const reduzido = useMovimentoReduzido();
  const pulso = useLoopAnimado(!reduzido, PULSO_EM_MS);
  const opacidade = pulso.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, OPACIDADE_MINIMA, 1],
  });

  // `dataUpdatedAt` do TanStack vale 0 enquanto nada foi buscado: sem hora para mostrar.
  const horaTexto = atualizadoEm ? formatarHoraCompleta(new Date(atualizadoEm)) : null;
  const aviso =
    `Esta tela atualiza sozinha a cada ${intervaloSegundos} s.` +
    (horaTexto ? ` Última atualização às ${horaTexto}.` : '');

  return (
    <View
      style={[
        estilos.barra,
        { backgroundColor: colors.bg.highlight, borderColor: colors.text.primary },
      ]}
    >
      <Icone nome="bell" tamanho="destaque" cor={colors.text.primary} />
      <View style={estilos.texto}>
        <View role="status" aria-live="polite" testID="novidade">
          {titulo ? <Texto peso="bold">{titulo}</Texto> : null}
        </View>
        <Texto nivel="sm" cor="secundario">
          {aviso}
        </Texto>
      </View>
      <Animated.View
        aria-hidden
        style={[
          estilos.ponto,
          { backgroundColor: colors.text.accent },
          reduzido ? null : { opacity: opacidade },
        ]}
      />
    </View>
  );
}
