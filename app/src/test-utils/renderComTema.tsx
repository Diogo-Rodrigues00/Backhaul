// Utilitário de testes (não entra no app): renderiza componentes com o tema, sem ler o
// armazenamento nem esperar efeitos do TemaProvider.
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { montarTema, type Esquema } from '@/state/tema/montarTema';
import { TemaContext, type ValorTema } from '@/state/tema/TemaProvider';

export function valorDoTema(esquema: Esquema = 'light'): ValorTema {
  return {
    ...montarTema(esquema),
    preferencia: 'sistema',
    esquema,
    alternar: () => {},
    pronto: true,
  };
}

export function comTema(ui: ReactElement, esquema: Esquema = 'light'): ReactElement {
  return <TemaContext.Provider value={valorDoTema(esquema)}>{ui}</TemaContext.Provider>;
}

/** `render` do RNTL (assíncrono no v14) já dentro do tema. */
export async function renderizar(ui: ReactElement, esquema: Esquema = 'light') {
  return render(comTema(ui, esquema));
}
