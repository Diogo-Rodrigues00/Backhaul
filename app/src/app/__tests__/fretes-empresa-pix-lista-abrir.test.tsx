// Pix da lista, ao abrir a tela (card 044 + revisão): com o pagamento já retido e `pix_*` residual, o painel
// não reabre e nada é anunciado. Abrir a tela não é uma transição de pagamento.
import { screen } from 'expo-router/testing-library';

import { ANUNCIO_PAGAMENTO_CONFIRMADO } from '@/components/organisms/CartaoFreteEmpresa';
import { anunciar, moverFoco } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { abrir, CODIGO, expiraEm, listaCom } from '@/test-utils/cenarioPixLista';

jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));
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
  jest.mocked(anunciar).mockClear();
  jest.mocked(moverFoco).mockClear();
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

it('pix_* residual com comissão retida: não abre o painel e não anuncia "Pagamento confirmado"', async () => {
  listaCom({
    comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'retido' },
    status_pagamento: 'retido',
    pix_copia_cola: CODIGO,
    pix_expira_em: expiraEm(30),
  });
  await abrir();

  expect(screen.queryByRole('heading', { name: 'Pagamento por Pix' })).toBeNull();
  expect(screen.queryByText(CODIGO)).toBeNull();
  expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
  expect(anunciar).not.toHaveBeenCalledWith(ANUNCIO_PAGAMENTO_CONFIRMADO);
  expect(moverFoco).not.toHaveBeenCalled();
});
