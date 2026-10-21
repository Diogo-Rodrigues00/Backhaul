import { Text, View } from 'react-native';

// PR DE TESTE (não mergear): contraste quebrado para provar que o portão axe fica vermelho.
export default function Inicio() {
  return (
    <View role="main">
      <Text role="heading" aria-level={1}>
        Backhaul
      </Text>
      <Text style={{ color: '#cccccc' }}>
        Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.
      </Text>
    </View>
  );
}
