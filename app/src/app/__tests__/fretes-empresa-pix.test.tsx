// Pagamento por Pix da empresa (card 048): painel com QR, código, valor e comissão da API; erros 502
// e 409; Pix só em memória (recarregar mostra "Pagamento pendente" sem código); modo simulado intacto.
// A espera pela confirmação (5 s, tempo falso) está em `fretes-empresa-pix.polling.test.tsx`.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { anunciar } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirFretesDaEmpresa,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioFretesEmpresa';

import { FRETE_ACEITO_ID, fretesDaEmpresaMock } from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

jest.mock('@/lib/a11y', () => ({
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
  esconderParaLeitor: jest.fn(),
}));
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

const CODIGO = '00020126580014br.gov.bcb.pix0136abc-sandbox-backhaul5204000053039865802BR6304ABCD';
const expiraEm = () => new Date(Date.now() + 30 * 60_000).toISOString();

function respostaPix(percentual = 7.5, comissao = 262.5) {
  return HttpResponse.json(
    {
      transacao: {
        id: 'tr-1',
        frete_id: FRETE_ACEITO_ID,
        valor_frete: 3500,
        percentual_comissao: percentual,
        valor_comissao: comissao,
        status_pagamento: 'pendente',
        criado_em: new Date().toISOString(),
      },
      pix: {
        copia_e_cola: CODIGO,
        qr_code_base64: 'iVBORw0KGgo=',
        expira_em: expiraEm(),
      },
    },
    { status: 201 },
  );
}

/** GET da lista: o frete "aceito" fica com o status informado (padrão: ainda não pago). */
function listaComStatus(status: string | null) {
  servidor.use(
    http.get(urlMock('/fretes/meus'), () =>
      HttpResponse.json({
        fretes: fretesDaEmpresaMock.map((frete) =>
          frete.id === FRETE_ACEITO_ID ? { ...frete, status_pagamento: status } : frete,
        ),
      }),
    ),
  );
}

beforeEach(async () => {
  jest.mocked(anunciar).mockClear();
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

async function abrir() {
  await abrirFretesDaEmpresa();
  await aguardarSessao();
  await aguardarLista();
}

async function pedirPagamento() {
  await fireEvent.press(
    screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
  );
  await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
  await fireEvent.press(screen.getByRole('button', { name: 'Pagar frete' }));
}

const dialogos = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');

describe('Meus fretes (empresa): pagamento por Pix', () => {
  it('201 com pix: mostra o painel com QR, código, valor, comissão da API e validade', async () => {
    servidor.use(http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () => respostaPix()));
    await abrir();
    listaComStatus('pendente');
    await pedirPagamento();

    expect(await screen.findByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    expect(screen.getByLabelText('QR Code do Pix de R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();
    // Comissão exatamente como a API devolveu (7,5%, nunca um percentual fixo).
    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 262,50')).toBeOnTheScreen();
    expect(screen.getByText('Aguardando confirmação do pagamento…')).toBeOnTheScreen();
    expect(anunciar).toHaveBeenCalledWith('Pix gerado. Aguardando confirmação do pagamento');
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    // Pendente: sem "Pagar frete" de novo e sem o resumo do pagamento simulado.
    expect(
      screen.queryByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Resumo do pagamento' })).toBeNull();
    expect(screen.getAllByText('Pagamento pendente').length).toBeGreaterThan(0);
  });

  it('"Ocultar Pix" recolhe o painel e "Ver Pix pendente" o traz de volta', async () => {
    servidor.use(http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () => respostaPix()));
    await abrir();
    listaComStatus('pendente');
    await pedirPagamento();
    await screen.findByRole('heading', { name: 'Pagamento por Pix' });

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar Pix' }));
    expect(screen.queryByRole('heading', { name: 'Pagamento por Pix' })).toBeNull();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Ver Pix pendente de Produtos inflamáveis' }),
    );
    expect(await screen.findByText(CODIGO)).toBeOnTheScreen();
  });

  it('sem pix na resposta (modo simulado): "Pagamento registrado" e resumo, como antes', async () => {
    await abrir();
    await pedirPagamento();

    expect(await screen.findByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    expect(anunciar).toHaveBeenCalledWith('Pagamento registrado');
    expect(screen.queryByRole('heading', { name: 'Pagamento por Pix' })).toBeNull();
  });

  it('lista com pagamento pendente e sem Pix em memória: rótulo e explicação, sem "Ver Pix"', async () => {
    listaComStatus('pendente');
    await abrirFretesDaEmpresa();
    await aguardarSessao();
    await aguardarLista();

    expect(
      await screen.findByText(/O código Pix desta cobrança não está mais disponível/),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Pagamento pendente').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Ver Pix pendente/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Pagar frete de/ })).toBeNull();
  });

  it('502: o diálogo fica aberto com a mensagem e "Tentar de novo"; a nova tentativa funciona', async () => {
    let tentativa = 0;
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () => {
        tentativa += 1;
        return tentativa === 1 ? respostaErro(502, 'bad gateway') : respostaPix();
      }),
    );
    await abrir();
    listaComStatus('pendente');
    await pedirPagamento();

    expect(
      await screen.findByText('Serviço de pagamento indisponível, tente novamente'),
    ).toBeOnTheScreen();
    expect(dialogos()).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
  });

  it('409 em frete entregue (modo de teste): mostra a mensagem da API', async () => {
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () =>
        respostaErro(409, 'frete entregue não pode ser pago'),
      ),
    );
    await abrir();
    await pedirPagamento();

    expect(await screen.findByText('frete entregue não pode ser pago')).toBeOnTheScreen();
    await waitFor(() => expect(dialogos()).toHaveLength(0));
  });
});
