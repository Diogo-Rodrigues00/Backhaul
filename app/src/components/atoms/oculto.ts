import type { ViewStyle } from 'react-native';

// Visualmente oculto, mas lido por leitor de tela (técnica "sr-only"): 1×1, sem margem útil, cortado.
// Sem `display: none`, `opacity: 0` nem `aria-hidden`, que escondem do leitor também.
const LADO = 1;

export const estiloOculto: ViewStyle = {
  position: 'absolute',
  width: LADO,
  height: LADO,
  margin: -LADO,
  padding: 0,
  borderWidth: 0,
  overflow: 'hidden',
};
