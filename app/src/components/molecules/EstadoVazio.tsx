import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsEstadoVazio {
  /** Ex.: "Você ainda não publicou uma disponibilidade". Vira um `h2`. */
  titulo: string;
  /** Uma frase que explica o que fazer. */
  descricao: string;
  /** Obrigatória (CT-02): todo estado vazio leva a uma próxima ação. */
  acao: ReactNode;
  icone?: NomeIcone;
}

// Protótipo (.empty): círculo de 72 px com o ícone de 36 px, borda tracejada de 3 px na caixa.
const LADO_CIRCULO = 72;
const LADO_ICONE = 36;
const LARGURA_TEXTO = 460;

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    caixa: {
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[8],
      paddingHorizontal: space[6],
      borderWidth: border.widthStrong,
      borderStyle: 'dashed',
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    circulo: {
      width: LADO_CIRCULO,
      height: LADO_CIRCULO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: border.widthStrong,
    } satisfies ViewStyle,
    texto: { textAlign: 'center', maxWidth: LARGURA_TEXTO } as const,
    acao: { marginTop: space[2] } satisfies ViewStyle,
  } as const;
}

/**
 * Estado vazio (EmptyState): ícone num círculo âmbar claro, título `h2`, frase e a ação. Sem ação
 * não compila: o vazio nunca deixa a pessoa sem saída (CT-02).
 */
export function EstadoVazio({ titulo, descricao, acao, icone = 'inbox' }: PropsEstadoVazio) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();

  return (
    <View style={[estilos.caixa, { borderColor: colors.border.control }]}>
      <View
        aria-hidden
        style={[
          estilos.circulo,
          { backgroundColor: colors.bg.highlight, borderColor: colors.border.strong },
        ]}
      >
        <Icone nome={icone} tamanho={LADO_ICONE} cor={colors.text.primary} />
      </View>
      <Titulo nivel={2} style={estilos.texto}>
        {titulo}
      </Titulo>
      <Texto cor="secundario" style={estilos.texto}>
        {descricao}
      </Texto>
      <View style={estilos.acao}>{acao}</View>
    </View>
  );
}
