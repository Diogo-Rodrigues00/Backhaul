// Pix da lista, pago depois de recarregar (card 044 + revisão): a lista passa de pendente para retido, sem
// `pix_*`. A tela avisa "Pagamento confirmado", anuncia e leva o foco ao resumo (WCAG 2.4.3, como no 046).
// Um arquivo por cenário: cada teste deixa estado do render (ver fretes-empresa-pix.test.tsx).
import { fireEvent, screen } from 'expo-router/testing-library';

import { ANUNCIO_PAGAMENTO_CONFIRMADO } from '@/components/organisms/CartaoFreteEmpresa';
import { anunciar, moverFoco } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { focoNoCorpo } from '@/lib/focoNoCorpo';
import { abrir, listaCom, pendenteDaLista } from '@/test-utils/cenarioPixLista';

jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));
jest.mock('@/lib/focoNoCorpo', () => ({ focoNoCorpo: jest.fn(() => false) }));
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

it('a lista passa de pendente para retido: aviso "Pagamento confirmado", anúncio e foco no resumo', async () => {
  // O foco estava perdido (no corpo): é o caso que a tela precisa tratar.
  jest.mocked(focoNoCorpo).mockReturnValue(true);
  listaCom(pendenteDaLista);
  await abrir();
  expect(await screen.findByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
  expect(screen.getByText(pendenteDaLista.pix_copia_cola)).toBeOnTheScreen();

  // A empresa pagou: a próxima leitura traz o frete retido, sem Pix.
  listaCom({
    comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'retido' },
    status_pagamento: 'retido',
    pix_copia_cola: null,
    pix_expira_em: null,
  });
  fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

  expect(
    await screen.findByText('O Pix foi recebido. A situação do pagamento está no resumo abaixo.'),
  ).toBeOnTheScreen();
  expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
  expect(anunciar).toHaveBeenCalledWith(ANUNCIO_PAGAMENTO_CONFIRMADO);
  expect(anunciar).toHaveBeenCalledTimes(1);
  expect(moverFoco).toHaveBeenCalledTimes(1);
});
