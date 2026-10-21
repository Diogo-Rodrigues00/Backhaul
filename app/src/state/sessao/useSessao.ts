import { useContext } from 'react';

import { SessaoContext, type ValorSessao } from './SessaoContext';

export function useSessao(): ValorSessao {
  const valor = useContext(SessaoContext);
  if (valor === null) {
    throw new Error('useSessao precisa estar dentro do SessaoProvider (src/app/_layout.tsx).');
  }
  return valor;
}
