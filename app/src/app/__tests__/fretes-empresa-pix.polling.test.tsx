// Espera do Pix (card 048, ADR 0010): depois de gerar o Pix a lista é lida a cada 5 s (e não 10 s),
// só com a aba visível, até o pagamento virar `retido`; então "Pagamento confirmado" é anunciado sem
// mover o foco e a leitura volta a 10 s. `requisitar` é simulado e o tempo é falso.
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { renderizarComRota } from '@/test-utils/renderComRota';

import FretesDaEmpresa from '../empresa/fretes';

jest.mock('@/lib/a11y', () => ({
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
  esconderParaLeitor: jest.fn(),
}));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));

const anunciarMock = jest.mocked(anunciar);
const moverFocoMock = jest.mocked(moverFoco);

const CODIGO = '00020126580014br.gov.bcb.pix0136polling-sandbox5204000053039865802BR6304ABCD';

type StatusDaLista = null | 'pendente' | 'retido';
let statusDaLista: StatusDaLista = null;
let leituras = 0;
let expiraEm = '';

function frete() {
  return {
    id: 'frete-1',
    tipo_carga: 'Grãos',
    valor_final: 3500,
    status_entrega: 'aceito',
    coleta_em: null,
    entrega_em: null,
    criado_em: '2026-11-12T12:00:00.000Z',
    status_pagamento: statusDaLista,
    motorista: {
      id: 'm-1',
      nome_completo: 'João da Silva',
      veiculo_tipo: 'carreta',
      veiculo_placa: 'ABC1D23',
    },
  };
}

function simularApi() {
  return jest.spyOn(cliente, 'requisitar').mockImplementation(async (metodo: string) => {
    if (metodo === 'POST') {
      return {
        transacao: {
          id: 'tr-1',
          frete_id: 'frete-1',
          valor_frete: 3500,
          percentual_comissao: 5,
          valor_comissao: 175,
          status_pagamento: 'pendente',
          criado_em: '2026-11-12T12:00:00.000Z',
        },
        pix: { copia_e_cola: CODIGO, qr_code_base64: 'iVBORw0KGgo=', expira_em: expiraEm },
      };
    }
    leituras += 1;
    return { fretes: [frete()] };
  });
}

async function avancar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

let requisicoes: jest.SpyInstance;

async function montarEPedirPix() {
  const consulta = criarQueryClient();
  function Casca({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={consulta}>
        <CascaContext.Provider value={{ cabecalho: null, abas: undefined, habilitado: true }}>
          {children}
        </CascaContext.Provider>
      </QueryClientProvider>
    );
  }
  await renderizarComRota(
    <Casca>
      <FretesDaEmpresa />
    </Casca>,
  );
  await avancar(0);

  statusDaLista = 'pendente';
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Pagar frete de Grãos' }));
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Pagar frete' }));
  });
  await avancar(100);
  expect(await screen.findByText('Aguardando confirmação do pagamento…')).toBeOnTheScreen();
  return consulta;
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  anunciarMock.mockClear();
  moverFocoMock.mockClear();
  statusDaLista = null;
  leituras = 0;
  expiraEm = new Date(Date.now() + 30 * 60_000).toISOString();
  requisicoes = simularApi();
});

afterEach(() => {
  focusManager.setFocused(undefined);
  requisicoes.mockRestore();
  jest.useRealTimers();
});

describe('Meus fretes (empresa): espera do Pix', () => {
  it('lê a lista a cada 5 s enquanto o Pix está pendente e confirma sem mover o foco', async () => {
    const consulta = await montarEPedirPix();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();

    const antes = leituras;
    await avancar(5_000);
    expect(leituras).toBe(antes + 1);
    await avancar(5_000);
    expect(leituras).toBe(antes + 2);
    expect(screen.queryByText('Pagamento confirmado')).toBeNull();

    // O "webhook" chegou: a próxima leitura traz `retido`.
    statusDaLista = 'retido';
    const focoAntes = moverFocoMock.mock.calls.length;
    await avancar(5_000);
    await avancar(100);

    expect(await screen.findByText('Pagamento confirmado')).toBeOnTheScreen();
    expect(anunciarMock).toHaveBeenCalledWith('Pagamento confirmado');
    expect(screen.queryByText('Aguardando confirmação do pagamento…')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Pagamento por Pix' })).toBeNull();
    // Código e QR saem da tela; o resumo da API fica.
    expect(screen.queryByText(CODIGO)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    // Foco estável: o anúncio não chama `moverFoco`.
    expect(moverFocoMock.mock.calls.length).toBe(focoAntes);

    // Confirmado: o ritmo volta a 10 s (a cada 5 s seriam 4 leituras em 20 s).
    const depois = leituras;
    await avancar(20_000);
    expect(leituras - depois).toBeLessThanOrEqual(2);
    consulta.clear();
  });

  it('com a aba oculta não consulta; ao voltar, retoma', async () => {
    const consulta = await montarEPedirPix();
    await act(async () => {
      focusManager.setFocused(false);
    });
    const antes = leituras;
    await avancar(30_000);
    expect(leituras).toBe(antes);
    consulta.clear();
  });

  it('o código vencido vira aviso em texto, sem QR nem botão de copiar', async () => {
    expiraEm = new Date(Date.now() + 40_000).toISOString();
    const consulta = await montarEPedirPix();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();

    await avancar(60_000);
    expect(await screen.findByText('Código Pix expirado')).toBeOnTheScreen();
    expect(screen.getByText(/tente de novo mais tarde ou fale com o suporte/)).toBeOnTheScreen();
    expect(screen.queryByText(CODIGO)).toBeNull();
    expect(screen.queryByRole('button', { name: /Gerar novo Pix/ })).toBeNull();
    consulta.clear();
  });
});
