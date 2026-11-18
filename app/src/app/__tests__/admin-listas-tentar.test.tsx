// "Tentar de novo" na lista de fretes do admin (card 041): arquivo próprio porque tocar no botão
// deixa o estado do render para o próximo teste do mesmo arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { abrirListaAdmin, aguardarSessao, responderFretes } from '@/test-utils/cenarioListasAdmin';

import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

beforeEach(async () => {
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-admin');
});

describe('Fretes do admin: tentar de novo', () => {
  it('"Tentar de novo" refaz a requisição e mostra os fretes', async () => {
    servidor.use(http.get(urlMock('/admin/fretes'), () => respostaErro(500, 'erro interno')));
    await abrirListaAdmin('/admin/fretes');
    await aguardarSessao();
    await screen.findByText('Algo deu errado. Tente de novo.');

    const contador = responderFretes();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(contador.chamadas).toBe(1));
    await screen.findByRole('heading', { name: 'Fretes mais recentes' });
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });
});
