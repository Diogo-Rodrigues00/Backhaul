// Setup global do Jest: URL da API de teste e servidor MSW (mocks/node.ts).
import { servidor, URL_BASE_TESTE } from './mocks/node';

process.env.EXPO_PUBLIC_API_URL = URL_BASE_TESTE;

// Requisição sem handler é erro de teste (evita bater numa API real por engano).
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

// O Jest não executa `import()` dinâmico: o corpo de "Cargas próximas" (React.lazy, ADR 0011) vem de
// um módulo falso que devolve o componente na hora. Vale para todo teste que renderize a rota.
jest.mock('@/telas/CorpoCargasProximas.carregar', () => ({
  carregarCorpoCargasProximas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCargasProximas')),
}));

// Idem para o diálogo de proposta (card 025): React.lazy na primeira abertura.
jest.mock('@/components/organisms/FormularioProposta.carregar', () => ({
  carregarFormularioProposta: () =>
    Promise.resolve({
      default: jest.requireActual('@/components/organisms/FormularioProposta').FormularioProposta,
    }),
}));
