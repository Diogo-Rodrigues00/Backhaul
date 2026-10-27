// Pagamento da empresa (MVP-17): erros do POST /fretes/:id/pagamento. Arquivo próprio porque cada
// teste deixa estado do render e o 401 (último) muda a navegação.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  abrirFretesDaEmpresa,
  aguardarLista,
  aguardarSessao,
  caminho,
} from '@/test-utils/cenarioFretesEmpresa';

import { FRETE_ACEITO_ID, fretesDaEmpresaMock } from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
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
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

async function abrirEPedirPagamento() {
  await abrirFretesDaEmpresa();
  await aguardarSessao();
  await aguardarLista();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
  );
  await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
  await fireEvent.press(screen.getByRole('button', { name: 'Pagar frete' }));
}

const dialogos = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');

/** Mock do GET: depois do 409, a lista já mostra o frete pago (a recarga muda o cartão). */
function lerComFretePago() {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/fretes/meus'), () => {
      contador.chamadas += 1;
      const fretes = fretesDaEmpresaMock.map((frete) =>
        frete.id === FRETE_ACEITO_ID ? { ...frete, status_pagamento: 'retido' } : frete,
      );
      return HttpResponse.json({ fretes });
    }),
  );
  return contador;
}

describe('Meus fretes (empresa): erros do pagamento', () => {
  it('409 "frete já foi pago": mostra a mensagem, fecha o diálogo e recarrega a lista', async () => {
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        respostaErro(409, 'frete já foi pago'),
      ),
    );
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();
    const contador = lerComFretePago();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    );
    await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar frete' }));

    expect(await screen.findByText('frete já foi pago')).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    await waitFor(() => expect(contador.chamadas).toBeGreaterThanOrEqual(1));
    // Recarregada, a lista já não oferece "Pagar frete" para esse frete.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
      ).toBeNull(),
    );
  });

  it('409 "frete cancelado não pode ser pago": mostra a mensagem da API', async () => {
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        respostaErro(409, 'frete cancelado não pode ser pago'),
      ),
    );
    await abrirEPedirPagamento();

    expect(await screen.findByText('frete cancelado não pode ser pago')).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
  });

  it('500: o diálogo continua aberto com "Algo deu errado. Tente de novo."', async () => {
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrirEPedirPagamento();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(dialogos()).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Resumo do pagamento' })).toBeNull();
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('401: apaga o token e leva ao login', async () => {
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        respostaErro(401, 'token ausente'),
      ),
    );
    await abrirEPedirPagamento();

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
