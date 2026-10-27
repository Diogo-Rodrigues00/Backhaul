// Meus fretes da empresa (CT-09, ADR 0010): a tela se atualiza sozinha a cada 10 s com a aba
// visível, não pede nada com a aba oculta e anuncia a mudança de status sem mover o foco.
// `requisitar` é simulado e o tempo é falso: nada depende de I/O real nem de espera.
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar } from '@/lib/a11y';
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

const motorista = {
  id: 'm-1',
  nome_completo: 'João da Silva',
  veiculo_tipo: 'carreta',
  veiculo_placa: 'ABC1D23',
};

function leitura(statusEntrega: 'aceito' | 'em_transito' | 'entregue') {
  return {
    fretes: [
      {
        id: 'frete-1',
        tipo_carga: 'Grãos',
        valor_final: 3500,
        status_entrega: statusEntrega,
        coleta_em: statusEntrega === 'aceito' ? null : '2026-10-22T12:00:00.000Z',
        entrega_em: statusEntrega === 'entregue' ? '2026-10-22T18:00:00.000Z' : null,
        criado_em: '2026-10-21T12:00:00.000Z',
        status_pagamento: null,
        motorista,
      },
    ],
  };
}

async function avancar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** Um ciclo de 10 s mais uma folga: o TanStack entrega o resultado à tela num timer de 0 ms. */
async function avancarUmCiclo() {
  await avancar(10_000);
  await avancar(100);
}

let requisicoes: jest.SpyInstance;

async function montar() {
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
  return consulta;
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  anunciarMock.mockClear();
});

afterEach(() => {
  focusManager.setFocused(undefined);
  requisicoes.mockRestore();
  jest.useRealTimers();
});

describe('Meus fretes (empresa): atualização automática', () => {
  it('com a aba visível pede de novo a cada 10 s; oculta por 30 s, nenhuma requisição', async () => {
    requisicoes = jest.spyOn(cliente, 'requisitar').mockResolvedValue(leitura('aceito'));
    const consulta = await montar();
    expect(requisicoes).toHaveBeenCalledTimes(1);

    await avancar(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(2);
    await avancar(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(3);

    await act(async () => {
      focusManager.setFocused(false);
    });
    await avancar(30_000);
    expect(requisicoes).toHaveBeenCalledTimes(3);
    consulta.clear();
  });

  it('anuncia a mudança de status do motorista, na barra e na região viva, não a primeira carga', async () => {
    requisicoes = jest
      .spyOn(cliente, 'requisitar')
      .mockResolvedValueOnce(leitura('aceito'))
      .mockResolvedValue(leitura('em_transito'));
    const consulta = await montar();
    expect(await screen.findByText('Aceito')).toBeOnTheScreen();
    expect(anunciarMock).not.toHaveBeenCalled();

    await avancarUmCiclo();
    expect(anunciarMock).toHaveBeenCalledTimes(1);
    expect(anunciarMock).toHaveBeenCalledWith('Transporte iniciado: Grãos');
    expect(screen.getByText('Transporte iniciado: Grãos')).toBeOnTheScreen();

    // Mesma resposta no ciclo seguinte: nada novo a anunciar.
    await avancarUmCiclo();
    expect(anunciarMock).toHaveBeenCalledTimes(1);
    consulta.clear();
  });

  it('anuncia a entrega confirmada', async () => {
    requisicoes = jest
      .spyOn(cliente, 'requisitar')
      .mockResolvedValueOnce(leitura('em_transito'))
      .mockResolvedValue(leitura('entregue'));
    const consulta = await montar();
    await avancarUmCiclo();

    expect(anunciarMock).toHaveBeenCalledWith('Entrega confirmada: Grãos');
    consulta.clear();
  });
});
