// Cartão "Como o motorista vai ver" da tela Publicar carga (card 019): o mesmo `ResumoCarga` da lista
// do motorista, num cartão com borda. Fica em arquivo próprio, com export padrão, para a tela o
// carregar com `React.lazy` e ele não entrar no JS inicial da rota (ADR 0011).
import { View, type ViewStyle } from 'react-native';

import { ResumoCarga, type PropsResumoCarga } from '@/components/molecules/ResumoCarga';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

function criarEstilos({ border, colors, radius, space }: TemaVisual) {
  return {
    cartao: {
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.surface,
    } satisfies ViewStyle,
  } as const;
}

export default function PreviaCarga(props: PropsResumoCarga) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View role="group" aria-label="Prévia da carga" style={estilos.cartao}>
      <ResumoCarga {...props} />
    </View>
  );
}
