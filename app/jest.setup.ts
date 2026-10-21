// Setup global do Jest: URL da API de teste e servidor MSW (mocks/node.ts).
import { servidor, URL_BASE_TESTE } from './mocks/node';

process.env.EXPO_PUBLIC_API_URL = URL_BASE_TESTE;

// Requisição sem handler é erro de teste (evita bater numa API real por engano).
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());
