// Minhas disponibilidades: cancelar uma disponibilidade que não é a ativa (card 034, MVP-22). Arquivo
// próprio: o clique em "Cancelar" muda o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { ouvirAnuncios } from '@/lib/anuncios';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
  cartoes,
  textoDaAtiva,
} from '@/test-utils/cenarioMinhasDisponibilidades';
import {
  BOTAO_CANCELAR_ARAGUARI,
  dialogos,
  listaCom,
  ROTA_MINHAS,
  TEXTO_ATIVA_UBERLANDIA,
} from '@/test-utils/cenarioCancelarDisponibilidade';

import { DISPONIBILIDADE_ABERTA_ANTIGA_ID } from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';

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

describe('Minhas disponibilidades: cancelar uma que não é a ativa (card 034)', () => {
  it('200: a ativa não muda e nada é anunciado sobre a troca de ativa', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((texto) => anuncios.push(texto));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () =>
        HttpResponse.json({ disponibilidades: listaCom(DISPONIBILIDADE_ABERTA_ANTIGA_ID) }),
      ),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    await waitFor(() => expect(within(cartoes()[2]!).getByText('Cancelada')).toBeOnTheScreen());
    expect(textoDaAtiva()).toBe(TEXTO_ATIVA_UBERLANDIA);
    expect(screen.getByText('Disponibilidade cancelada.')).toBeOnTheScreen();
    expect(screen.queryByText(/Ativa agora/)).toBeNull();
    expect(anuncios.some((texto) => texto.startsWith('Disponibilidade ativa'))).toBe(false);
    parar();
  });
});
