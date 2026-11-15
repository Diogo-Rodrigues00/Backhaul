// Pix da lista, ao abrir a tela já paga (card 044 + revisão): sem transição de status, não há anúncio nem
// movimento de foco. Só a mudança pendente -> paga, vista na tela, conta como confirmação.
import { screen } from 'expo-router/testing-library';

import { ANUNCIO_PAGAMENTO_CONFIRMADO } from '@/components/organisms/CartaoFreteEmpresa';
import { anunciar, moverFoco } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { abrir, listaCom } from '@/test-utils/cenarioPixLista';

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

it('abrir a tela com o pagamento já retido: resumo, sem anúncio e sem mexer no foco', async () => {
  listaCom({
    comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'retido' },
    status_pagamento: 'retido',
    pix_copia_cola: null,
    pix_expira_em: null,
  });
  await abrir();

  expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
  expect(anunciar).not.toHaveBeenCalledWith(ANUNCIO_PAGAMENTO_CONFIRMADO);
  expect(moverFoco).not.toHaveBeenCalled();
});
