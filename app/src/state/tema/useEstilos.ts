import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { montarTema, type TemaVisual } from './montarTema';
import { useTema } from './useTema';

type Estilos = Parameters<typeof StyleSheet.create>[0];

/**
 * `StyleSheet.create(criarEstilos(tema))`, memoizado por esquema. Passe uma função do módulo
 * (`function criarEstilos(t: TemaVisual) {...}`), não uma inline, senão a memoização se perde.
 * Na web o tema visual é um só (cores são variáveis CSS), então os estilos nascem uma vez.
 */
export function useEstilos<T extends Estilos>(criarEstilos: (tema: TemaVisual) => T): T {
  const { esquema } = useTema();
  const tema = montarTema(esquema); // mesmo objeto enquanto o esquema (e a plataforma) não mudar
  return useMemo(() => StyleSheet.create(criarEstilos(tema)), [criarEstilos, tema]);
}
