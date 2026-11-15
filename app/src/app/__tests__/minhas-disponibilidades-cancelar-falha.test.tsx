// Minhas disponibilidades: falha ao cancelar com 500 (card 034): o diálogo continua aberto, mostra o erro
// dentro dele e nada muda na lista. Arquivo próprio: o clique em "Cancelar" muda o estado do render.
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { http } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
  cartoes,
} from '@/test-utils/cenarioMinhasDisponibilidades';
import {
  BOTAO_CANCELAR_ARAGUARI,
  dialogos,
  ROTA_CANCELAR,
} from '@/test-utils/cenarioCancelarDisponibilidade';

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
  await apagar(CHAVES.disponibilidadeAtiva);
  await gravar(CHAVES.token, 'mock-motorista');
});

describe('Minhas disponibilidades: falha ao cancelar (card 034)', () => {
  it('500: o diálogo continua aberto, mostra o erro dentro dele e nada muda na lista', async () => {
    servidor.use(http.post(urlMock(ROTA_CANCELAR), () => respostaErro(500, 'erro interno')));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    await waitFor(() =>
      expect(within(dialogos()[0]!).getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(dialogos()).toHaveLength(1);
    expect(screen.queryByText('Disponibilidade cancelada.')).toBeNull();
    expect(screen.queryByText('Não foi possível cancelar.')).toBeNull();
    expect(screen.getAllByText('Aberta')).toHaveLength(2);
    expect(cartoes()).toHaveLength(3);
  });
});
