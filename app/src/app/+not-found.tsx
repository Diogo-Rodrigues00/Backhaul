import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function NaoEncontrada() {
  return (
    <View role="main">
      <Text role="heading" aria-level={1}>
        Página não encontrada
      </Text>
      <Link href="/">Voltar para o início</Link>
    </View>
  );
}
