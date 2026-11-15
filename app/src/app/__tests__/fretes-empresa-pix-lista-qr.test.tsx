// Pix da lista sem QR (card 044 + revisão): "Mostrar QR Code" pede a mesma cobrança pelo POST idempotente,
// mostra o carregamento enquanto espera, traz o QR e leva o foco ao painel.
import { fireEvent, screen } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { moverFoco } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrir,
  expiraEm,
  listaCom,
  pendenteDaLista,
  PNG_1X1,
  CODIGO_NOVO,
} from '@/test-utils/cenarioPixLista';

import { FRETE_ACEITO_ID } from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';

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
  jest.mocked(moverFoco).mockClear();
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

it('pede a cobrança de novo, mostra o carregamento, traz o QR e move o foco para o painel', async () => {
  listaCom(pendenteDaLista);
  servidor.use(
    http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), async () => {
      await delay(300);
      return HttpResponse.json(
        {
          transacao: {
            id: 'tr-qr',
            frete_id: FRETE_ACEITO_ID,
            valor_frete: 3200,
            percentual_comissao: 5,
            valor_comissao: 160,
            status_pagamento: 'pendente',
            criado_em: new Date().toISOString(),
          },
          pix: { copia_e_cola: CODIGO_NOVO, qr_code_base64: PNG_1X1, expira_em: expiraEm(30) },
        },
        { status: 200 },
      );
    }),
  );
  await abrir();
  fireEvent.press(
    await screen.findByRole('button', { name: 'Mostrar QR Code de Produtos inflamáveis' }),
  );

  expect(await screen.findByText('Gerando QR Code…')).toBeOnTheScreen();
  expect(await screen.findByLabelText('QR Code do Pix de R$ 3.200,00')).toBeOnTheScreen();
  expect(screen.getByText(CODIGO_NOVO)).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Mostrar QR Code de Produtos inflamáveis' }),
  ).toBeNull();
  expect(moverFoco).toHaveBeenCalledTimes(1);
});
