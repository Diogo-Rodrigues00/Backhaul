import { Text, View } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { maxFontSizeMultiplier, fonte } from '@/theme/tipografia';

// Tela provisória: a apresentação definitiva chega nos cards seguintes.
// Já usa tema e fonte para provar o mecanismo (card 005).
export default function Inicio() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View role="main" style={estilos.conteudo}>
      <Text
        role="heading"
        aria-level={1}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={estilos.titulo}
      >
        Backhaul
      </Text>
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={estilos.texto}>
        Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.
      </Text>
    </View>
  );
}

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    conteudo: { padding: space[4], gap: space[2] },
    titulo: { ...fonte('3xl'), color: colors.text.primary },
    texto: { ...fonte('base'), color: colors.text.primary },
  } as const;
}
