import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

export default function NaoEncontrada() {
  return (
    <View role="main">
      <Head>
        <title>Página não encontrada | Backhaul</title>
      </Head>
      <Text role="heading" aria-level={1}>
        Página não encontrada
      </Text>
      <Link href="/">Voltar para o início</Link>
    </View>
  );
}
