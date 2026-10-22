// Cargas próximas: "Atualizar" refaz a busca. Sem atualização automática.
// Arquivo próprio: tocar nos botões deixa o estado do render para o próximo teste.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirCargasProximas,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioCargasProximas';

import { cargasProximasMock } from '../../../mocks/fixtures/cargas';
import { servidor, urlMock } from '../../../mocks/node';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
      propostasEnviadas: 'backhaul.propostasEnviadas',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});
jest.mock('@/telas/CorpoCargasProximas.carregar', () => ({
  carregarCorpoCargasProximas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCargasProximas')),
}));

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  await apagar(CHAVES.propostasEnviadas);
  await gravar(CHAVES.token, 'mock-motorista');
});

describe('Cargas próximas: atualizar', () => {
  it('"Atualizar" refaz a busca de cargas e de propostas uma vez; a tela não se atualiza sozinha', async () => {
    await abrirCargasProximas();
    await aguardarSessao();
    await aguardarLista();

    const contador = { cargas: 0, propostas: 0 };
    servidor.use(
      http.get(urlMock('/cargas/proximas'), () => {
        contador.cargas += 1;
        return HttpResponse.json({ cargas: cargasProximasMock });
      }),
      http.get(urlMock('/propostas/minhas'), () => {
        contador.propostas += 1;
        return HttpResponse.json({ propostas: [] });
      }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => expect(contador).toEqual({ cargas: 1, propostas: 1 }));
  });
});
