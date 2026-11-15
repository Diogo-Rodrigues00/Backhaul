// Pix da lista sem QR, com falha (card 044 + revisão): 502 do gateway mostra o erro, o botão continua no lugar
// e o copia e cola segue disponível. O erro é o padrão de pagamento indisponível (lib/erros).
import { fireEvent, screen } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { abrir, CODIGO, listaCom, pendenteDaLista } from '@/test-utils/cenarioPixLista';

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
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

it('502 do gateway: mostra o erro, o botão continua e o copia e cola segue disponível', async () => {
  listaCom(pendenteDaLista);
  servidor.use(
    http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
      HttpResponse.json(
        { erro: 'falha no gateway', codigo: 'gateway_indisponivel' },
        { status: 502 },
      ),
    ),
  );
  await abrir();
  fireEvent.press(
    await screen.findByRole('button', { name: 'Mostrar QR Code de Produtos inflamáveis' }),
  );

  expect(
    await screen.findByText('Serviço de pagamento indisponível, tente novamente'),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Mostrar QR Code de Produtos inflamáveis' }),
  ).toBeOnTheScreen();
  expect(screen.getByText(CODIGO)).toBeOnTheScreen();
  expect(screen.queryByLabelText(/QR Code do Pix/)).toBeNull();
});
