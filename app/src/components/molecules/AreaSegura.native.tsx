// iPhone: o fundo do cabeçalho e da barra vai até a borda e o conteúdo respeita o entalhe.
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PropsAreaSegura } from './areaSeguraComum';

export type { PropsAreaSegura } from './areaSeguraComum';

export function AreaSegura({ lado, ...resto }: PropsAreaSegura) {
  return <SafeAreaView edges={lado === 'topo' ? ['top'] : ['bottom']} {...resto} />;
}
