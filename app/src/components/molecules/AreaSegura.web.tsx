// Web: não há entalhe a respeitar; uma View comum (e nenhum código de safe-area no bundle web).
import { View } from 'react-native';

import type { PropsAreaSegura } from './areaSeguraComum';

export type { PropsAreaSegura } from './areaSeguraComum';

export function AreaSegura({ lado: _lado, ...resto }: PropsAreaSegura) {
  return <View {...resto} />;
}
