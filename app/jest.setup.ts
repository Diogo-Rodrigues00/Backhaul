// Setup global do Jest: URL da API de teste, servidor MSW (mocks/node.ts) e TanStack Query.
import * as TanstackQuery from '@tanstack/react-query';

import { definirTanstack } from '@/api/tanstack';

import { servidor, URL_BASE_TESTE } from './mocks/node';

process.env.EXPO_PUBLIC_API_URL = URL_BASE_TESTE;

// No app o TanStack chega por `state/consultas/consultas.tsx`, aberto sob demanda nas áreas logadas
// (ADR 0004, adendo); o Jest não executa `import()`, então a ponte dos hooks é ligada aqui.
definirTanstack(TanstackQuery);

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

// Idem para os corpos que o app abre por React.lazy com o cliente de dados (ADR 0004, adendo): os
// testes montam o componente na hora e dão o próprio QueryClientProvider (mocks/utils-teste.tsx).
jest.mock('@/telas/CorpoMinhasCargas.carregar', () => ({
  carregarCorpoMinhasCargas: () => Promise.resolve(jest.requireActual('@/telas/CorpoMinhasCargas')),
}));

jest.mock('@/telas/CorpoFretesDaEmpresa.carregar', () => ({
  carregarCorpoFretesDaEmpresa: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoFretesDaEmpresa')),
}));

jest.mock('@/state/disponibilidade-ativa/ConsultaDasDisponibilidades.carregar', () => ({
  carregarConsultaDasDisponibilidades: () =>
    Promise.resolve(
      jest.requireActual('@/state/disponibilidade-ativa/ConsultaDasDisponibilidades'),
    ),
}));
