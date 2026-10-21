import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { fonte, maxFontSizeMultiplier } from '@/theme/tipografia';

export default function NaoEncontrada() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View role="main" style={estilos.conteudo}>
      <Head>
        <title>Página não encontrada | Backhaul</title>
      </Head>
      <Text
        role="heading"
        aria-level={1}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={estilos.titulo}
      >
        Página não encontrada
      </Text>
      <Link href="/" style={estilos.link}>
        Voltar para o início
      </Link>
    </View>
  );
}

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    conteudo: { padding: space[4], gap: space[2] },
    titulo: { ...fonte('3xl'), color: colors.text.primary },
    link: { ...fonte('base'), color: colors.text.link, textDecorationLine: 'underline' },
  } as const;
}
