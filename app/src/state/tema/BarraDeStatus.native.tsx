import { StatusBar } from 'expo-status-bar';

import { useTema } from './useTema';

/** A barra de status segue o tema escolhido no app, não só o do aparelho. */
export function BarraDeStatus() {
  const { esquema } = useTema();
  return <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />;
}
