import { Text, View } from 'react-native';

// Tela provisória: a apresentação definitiva chega nos cards seguintes.
export default function Inicio() {
  return (
    <View role="main">
      <Text role="heading" aria-level={1}>
        Backhaul
      </Text>
      <Text>
        Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.
      </Text>
    </View>
  );
}
