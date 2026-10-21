import type { ViewProps } from 'react-native';

export interface PropsAreaSegura extends ViewProps {
  /** Qual borda da tela respeitar: `topo` (notch e barra de status) ou `base` (indicador de início). */
  lado: 'topo' | 'base';
}
