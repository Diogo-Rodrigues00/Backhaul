// Minhas disponibilidades (MVP-11, D-PO-03): "Usar esta" troca a ativa, anuncia, guarda no aparelho e
// "Cargas próximas" (a sonda da ativa) passa a usá-la. Arquivo próprio: tocar no botão deixa o estado
// do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { ouvirAnuncios } from '@/lib/anuncios';
import { lerEscolhaSalva } from '@/lib/disponibilidadeAtiva';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
  cartoes,
  textoDaAtiva,
} from '@/test-utils/cenarioMinhasDisponibilidades';

import { DISPONIBILIDADE_ABERTA_ANTIGA_ID } from '../../../mocks/fixtures/disponibilidades';

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

describe('Minhas disponibilidades: usar esta', () => {
  it('"Usar esta" muda a ativa, anuncia, guarda a escolha e a sonda das cargas próximas a recebe', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((texto) => anuncios.push(texto));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();
    expect(within(cartoes()[0]!).getByText('Ativa')).toBeOnTheScreen();

    fireEvent.press(
      screen.getByRole('button', { name: 'Usar esta disponibilidade perto de Araguari - MG' }),
    );

    // A indicação "Ativa" sai do primeiro cartão e vai para o de Araguari, uma só na tela.
    await waitFor(() => expect(within(cartoes()[1]!).queryByText('Ativa')).toBeOnTheScreen());
    expect(within(cartoes()[0]!).queryByText('Ativa')).toBeNull();
    expect(screen.getAllByText('Ativa')).toHaveLength(1);
    expect(textoDaAtiva()).toBe(`${DISPONIBILIDADE_ABERTA_ANTIGA_ID}|-18.6456|-48.1934|120|normal`);
    // A anterior agora pode ser usada de novo; a nova não oferece o botão.
    expect(
      screen.getByRole('button', { name: 'Usar esta disponibilidade perto de Uberlândia - MG' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Usar esta disponibilidade perto de Araguari - MG' }),
    ).toBeNull();
    // Anunciado sem mover o foco.
    expect(anuncios).toContain('Disponibilidade ativa: perto de Araguari - MG');
    // Guardada no aparelho: é isso que sobrevive a recarregar (web) e reabrir (iPhone).
    await waitFor(async () =>
      expect(lerEscolhaSalva(await ler(CHAVES.disponibilidadeAtiva))).toEqual({
        id: DISPONIBILIDADE_ABERTA_ANTIGA_ID,
      }),
    );
    parar();
  });
});
