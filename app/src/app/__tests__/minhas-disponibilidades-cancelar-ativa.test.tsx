// Minhas disponibilidades: cancelar a ativa com 200 (card 034, MVP-22). Arquivo próprio: o clique em
// "Cancelar" muda o estado do render para o próximo teste do arquivo.
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
  BOTAO_CANCELAR_UBERLANDIA,
  dialogos,
  listaCom,
  ROTA_MINHAS,
  TEXTO_ATIVA_ARAGUARI,
  TEXTO_ATIVA_UBERLANDIA,
} from '@/test-utils/cenarioCancelarDisponibilidade';

import { DISPONIBILIDADE_ABERTA_ID } from '../../../mocks/fixtures/disponibilidades';
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

describe('Minhas disponibilidades: cancelar a ativa (card 034)', () => {
  it('200 na ativa: o cartão vira "Cancelada", a ativa passa à próxima e a troca é anunciada', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((texto) => anuncios.push(texto));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();
    expect(textoDaAtiva()).toBe(TEXTO_ATIVA_UBERLANDIA);

    await fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_UBERLANDIA }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    expect(screen.getByText('Cancelar esta disponibilidade?')).toBeOnTheScreen();
    // A releitura que segue o cancelamento devolve a lista com a cancelada, como a API faria.
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () =>
        HttpResponse.json({ disponibilidades: listaCom(DISPONIBILIDADE_ABERTA_ID) }),
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    await waitFor(() => expect(within(cartoes()[0]!).getByText('Cancelada')).toBeOnTheScreen());
    expect(within(cartoes()[0]!).queryByText('Ativa')).toBeNull();
    expect(screen.queryByRole('button', { name: BOTAO_CANCELAR_UBERLANDIA })).toBeNull();
    expect(within(cartoes()[2]!).getByText('Ativa')).toBeOnTheScreen();
    expect(textoDaAtiva()).toBe(TEXTO_ATIVA_ARAGUARI);
    expect(screen.getByText('Disponibilidade cancelada.')).toBeOnTheScreen();
    expect(screen.getByText('Ativa agora: perto de Araguari - MG')).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    expect(anuncios).toContain('Disponibilidade ativa: perto de Araguari - MG');
    parar();
  });
});
