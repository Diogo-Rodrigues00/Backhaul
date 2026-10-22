// Meus fretes da empresa (MVP-17, CT-01 a CT-04): tela real com a área protegida e a API de mock
// (MSW). Os caminhos de erro do pagamento estão em `fretes-empresa-pagar.test.tsx` e o polling em
// `fretes-empresa-polling.test.tsx`.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirFretesDaEmpresa,
  aguardarLista,
  aguardarSessao,
  listaDeFretes,
} from '@/test-utils/cenarioFretesEmpresa';

import { FRETE_ACEITO_ID } from '../../../mocks/fixtures/fretes';
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

const tituloDoDialogo = 'Pagar o frete de R$ 3.200,00?';

describe('Meus fretes (empresa)', () => {
  it('mostra o h1, a barra de novidades e o botão Atualizar com a lista pronta', async () => {
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();

    expect(screen.getByRole('heading', { name: 'Meus fretes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(screen.getByText(/Esta tela atualiza sozinha a cada 10 s\./)).toBeOnTheScreen();
  });

  it('CT-01: enquanto carrega, mostra "Carregando fretes…" numa região de status', async () => {
    servidor.use(http.get(urlMock('/fretes/meus'), () => delay('infinite')));
    await abrirFretesDaEmpresa();
    await aguardarSessao();

    expect(screen.getByText('Carregando fretes…')).toBeOnTheScreen();
    expect(
      screen.container.queryAll((el) => el.props.role === 'status').length,
    ).toBeGreaterThanOrEqual(1);
    expect(listaDeFretes()).toHaveLength(0);
  });

  it('cada frete traz tipo, motorista, valor, andamento, datas e pagamento (MVP-17)', async () => {
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();

    const titulos = screen
      .getAllByRole('heading')
      .filter((h) => h.props['aria-level'] === 2)
      .map((h) => h.props.children);
    expect(titulos).toEqual(['Produtos inflamáveis', 'Grãos', 'Material de construção']);

    expect(screen.getAllByText('João da Silva')).toHaveLength(3);
    expect(screen.getAllByLabelText('Veículo: carreta')).toHaveLength(3);
    expect(screen.getAllByLabelText('Placa: ABC1D23')).toHaveLength(3);
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Andamento do frete')).toHaveLength(3);
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
    expect(screen.getByText('Pago, retido até a entrega')).toBeOnTheScreen();
    expect(screen.getByText('Liberado ao motorista')).toBeOnTheScreen();
  });

  it('"Pagar frete" só no frete sem pagamento; a lista não mostra comissão alguma (Q3)', async () => {
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();

    expect(screen.getAllByRole('button', { name: /^Pagar frete/ })).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Comissão da plataforma/)).toBeNull();
    expect(screen.queryByText(/Percentual de comissão/)).toBeNull();
  });

  it('pagar: confirmação sem comissão e, no 201, resumo com os valores da API (não fixos)', async () => {
    // Percentual diferente do padrão do backend, para provar que nada é fixo no app.
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        HttpResponse.json(
          {
            transacao: {
              id: 'transacao-1',
              frete_id: FRETE_ACEITO_ID,
              valor_frete: '3200.00',
              percentual_comissao: '7.50',
              valor_comissao: '240.00',
              status_pagamento: 'retido',
              criado_em: '2026-10-22T12:00:00.000Z',
            },
          },
          { status: 201 },
        ),
      ),
    );
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    );
    expect(await screen.findByRole('heading', { name: tituloDoDialogo })).toBeOnTheScreen();
    expect(
      screen.getByText('A comissão é calculada pela plataforma após o pagamento.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/\d\s*%/)).toBeNull();
    expect(screen.queryByText(/Comissão da plataforma/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Pagar frete' }));

    expect(await screen.findByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor do frete: R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 240,00')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Situação do pagamento: Pago, retido até a entrega'),
    ).toBeOnTheScreen();
    // O GET do mock ainda traz `null`: o cartão segue o pagamento recém-registrado e não deixa pagar de novo.
    expect(screen.queryByRole('button', { name: /^Pagar frete/ })).toBeNull();
    expect(screen.queryByText('Aguardando pagamento')).toBeNull();
    await waitFor(() =>
      expect(screen.container.queryAll((el) => el.props.role === 'alertdialog')).toHaveLength(0),
    );
  });

  it('CT-02: sem fretes, mostra "Nenhum frete ainda" com o link "Minhas cargas"', async () => {
    servidor.use(http.get(urlMock('/fretes/meus'), () => HttpResponse.json({ fretes: [] })));
    await abrirFretesDaEmpresa();
    await aguardarSessao();

    expect(await screen.findByRole('heading', { name: 'Nenhum frete ainda' })).toBeOnTheScreen();
    expect(screen.getByText('Aceite uma proposta para criar um frete.')).toBeOnTheScreen();
    const [link] = screen.getAllByRole('link', { name: 'Minhas cargas' });
    expect(link?.props.href).toBe('/empresa/cargas');
  });

  it('CT-03: 500 mostra "Algo deu errado. Tente de novo." e nenhuma lista', async () => {
    servidor.use(http.get(urlMock('/fretes/meus'), () => respostaErro(500, 'erro interno')));
    await abrirFretesDaEmpresa();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(listaDeFretes()).toHaveLength(0);
  });
});
