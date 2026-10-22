// Cargas próximas: "Tentar de novo" depois de um erro busca outra vez (CT-03). Arquivo próprio:
// tocar nos botões deixa o estado do render para o próximo teste.
import { fireEvent, screen } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirCargasProximas,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioCargasProximas';

import { cargasProximasMock } from '../../../mocks/fixtures/cargas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

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

describe('Cargas próximas: tentar de novo', () => {
  it('"Tentar de novo" depois de um erro busca outra vez e mostra a lista', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock('/cargas/proximas'), () =>
        falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json({ cargas: cargasProximasMock }),
      ),
    );
    await abrirCargasProximas();
    await aguardarSessao();
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();

    falhar = false;
    fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    await aguardarLista();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });
});
