// Servidor MSW para o Jest (ADR 0005). Decisão do card 004: `msw/node` intercepta o `fetch`
// do jest-expo (com o ajuste de resolução em jest.config.js), então o plano B (`getResponse`)
// não foi necessário.
import { setupServer } from 'msw/node';

import { criarHandlers } from './handlers';

/** Base usada pelos testes; jest.setup.ts a coloca em EXPO_PUBLIC_API_URL. */
export const URL_BASE_TESTE = 'http://api.mock.test';

export const servidor = setupServer(...criarHandlers(URL_BASE_TESTE));

/** URL completa de uma rota, para `servidor.use(http.get(urlMock('/saude'), ...))`. */
export function urlMock(caminho: string): string {
  return `${URL_BASE_TESTE}${caminho}`;
}
