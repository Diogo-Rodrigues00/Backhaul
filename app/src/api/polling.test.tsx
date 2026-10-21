// Atualização automática (ADR 0010, CT-09): com foco, 1 requisição a cada 10 s; sem foco, nenhuma.
// `requisitar` é simulado para o tempo falso controlar tudo sem depender de I/O real.
import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';

import { criarEnvoltorio } from '../../mocks/utils-teste';

import * as cliente from './cliente';
import { criarQueryClient, INTERVALO_ATUALIZACAO_MS } from './consulta';
import { useMeusFretes } from './fretes';
import { useMinhasPropostas, usePropostasDaCarga } from './propostas';

async function avancar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function montar<T>(usarHook: () => T) {
  const consulta = criarQueryClient();
  const resultado = await renderHook(usarHook, { wrapper: criarEnvoltorio(consulta) });
  await avancar(0);
  return { consulta, ...resultado };
}

let requisicoes: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  requisicoes = jest
    .spyOn(cliente, 'requisitar')
    .mockImplementation(() => Promise.resolve({ propostas: [], fretes: [] }));
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
  requisicoes.mockRestore();
});

describe('polling dos hooks de leitura', () => {
  it('automatico + foco: 1 requisição a cada 10 s', async () => {
    const { consulta } = await montar(() => usePropostasDaCarga('carga-1', { automatico: true }));
    expect(INTERVALO_ATUALIZACAO_MS).toBe(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(1);

    await avancar(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(2);
    await avancar(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(3);
    await avancar(9_000);
    expect(requisicoes).toHaveBeenCalledTimes(3);
    consulta.clear();
  });

  it('sem foco por 30 s: 0 requisições novas, e volta ao recuperar o foco', async () => {
    const { consulta } = await montar(() => useMinhasPropostas({ automatico: true }));
    expect(requisicoes).toHaveBeenCalledTimes(1);

    await act(async () => {
      focusManager.setFocused(false);
    });
    await avancar(30_000);
    expect(requisicoes).toHaveBeenCalledTimes(1);

    await act(async () => {
      focusManager.setFocused(true);
    });
    await avancar(0);
    // Ao voltar o foco, um refetch (a consulta já está velha).
    expect(requisicoes.mock.calls.length).toBeGreaterThanOrEqual(2);
    consulta.clear();
  });

  it('sem automatico: não repete sozinho', async () => {
    const { consulta } = await montar(() => useMeusFretes());
    await avancar(30_000);
    expect(requisicoes).toHaveBeenCalledTimes(1);
    consulta.clear();
  });

  it('desmontar a tela para o intervalo', async () => {
    const { consulta, unmount } = await montar(() => useMeusFretes({ automatico: true }));
    await avancar(10_000);
    expect(requisicoes).toHaveBeenCalledTimes(2);

    await unmount();
    await avancar(30_000);
    expect(requisicoes).toHaveBeenCalledTimes(2);
    consulta.clear();
  });
});
