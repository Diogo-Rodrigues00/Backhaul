// Minhas disponibilidades: cancelar com 404 (card 034): a mensagem da API vai ao aviso, sem erro técnico.
// Arquivo próprio: o clique em "Cancelar" muda o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
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

describe('Minhas disponibilidades: cancelar com 404 (card 034)', () => {
  it('mostra a mensagem da API no aviso e fecha o diálogo, sem erro técnico', async () => {
    servidor.use(
      http.post(urlMock(ROTA_CANCELAR), () => respostaErro(404, 'disponibilidade não encontrada')),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    expect(await screen.findByText('disponibilidade não encontrada')).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });
});
