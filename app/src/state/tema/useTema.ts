import { useContext } from 'react';

import { TemaContext, type ValorTema } from './TemaProvider';

/** Tokens do tema atual, preferência, esquema efetivo e `alternar()` (ADR 0008). */
export function useTema(): ValorTema {
  const valor = useContext(TemaContext);
  if (!valor) throw new Error('useTema precisa estar dentro de <TemaProvider>.');
  return valor;
}
