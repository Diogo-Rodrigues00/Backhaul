import { act, renderHook, waitFor } from '@testing-library/react-native';
import { http } from 'msw';

import { servidor, urlMock } from '../../mocks/node';
import { respostaErro } from '../../mocks/respostas';
import { ErroApi } from '@/lib/erros';

import * as cliente from './cliente';
import {
  ATRASO_LENTO_MS,
  INTERVALO_SAUDE_MS,
  reiniciarPortaoServidor,
  TOTAL_TENTATIVAS,
  usePortaoServidor,
} from './saude';

afterEach(() => {
  reiniciarPortaoServidor();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('usePortaoServidor (integração com MSW)', () => {
  it('200 em /saude leva a pronto', async () => {
    const { result } = await renderHook(() => usePortaoServidor());
    await waitFor(() => expect(result.current.estado).toBe('pronto'));
    expect(result.current.totalTentativas).toBe(18);
  });

  it('segunda montagem na mesma sessão não refaz a verificação', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(urlMock('/saude'), () => {
        chamadas += 1;
        return Response.json({ status: 'ok', banco: 'conectado' });
      }),
    );
    const primeira = await renderHook(() => usePortaoServidor());
    await waitFor(() => expect(primeira.result.current.estado).toBe('pronto'));
    await primeira.unmount();

    const segunda = await renderHook(() => usePortaoServidor());

    expect(segunda.result.current.estado).toBe('pronto');
    expect(chamadas).toBe(1);
  });
});

describe('usePortaoServidor (tempo controlado)', () => {
  function simularRequisicoes(respostas: ('ok' | 'falha' | 'pendente')[]) {
    let chamada = 0;
    return jest.spyOn(cliente, 'requisitar').mockImplementation(() => {
      const resposta = respostas[Math.min(chamada, respostas.length - 1)];
      chamada += 1;
      if (resposta === 'ok') return Promise.resolve({ status: 'ok', banco: 'conectado' });
      if (resposta === 'pendente') return new Promise(() => undefined);
      return Promise.reject(ErroApi.falha(503));
    });
  }

  it('503 conta como erro e a verificação tenta de novo a cada 5 s até dar certo', async () => {
    jest.useFakeTimers();
    const requisitar = simularRequisicoes(['falha', 'falha', 'ok']);
    const { result } = await renderHook(() => usePortaoServidor());

    expect(requisitar).toHaveBeenCalledTimes(1);
    expect(result.current.estado).toBe('verificando');
    expect(result.current.tentativa).toBe(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_SAUDE_MS);
    });
    expect(requisitar).toHaveBeenCalledTimes(2);
    expect(result.current.tentativa).toBe(2);
    expect(result.current.estado).not.toBe('pronto');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_SAUDE_MS);
    });
    expect(requisitar).toHaveBeenCalledTimes(3);
    expect(result.current.estado).toBe('pronto');
  });

  it('usa timeout de 5 s, sem autenticação, na rota /saude', async () => {
    jest.useFakeTimers();
    const requisitar = simularRequisicoes(['ok']);
    await renderHook(() => usePortaoServidor());
    expect(requisitar).toHaveBeenCalledWith('GET', '/saude', {
      autenticado: false,
      timeoutMs: 5_000,
    });
  });

  it('vira lento só depois de 500 ms sem resposta', async () => {
    jest.useFakeTimers();
    simularRequisicoes(['pendente']);
    const { result } = await renderHook(() => usePortaoServidor());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(ATRASO_LENTO_MS - 1);
    });
    expect(result.current.estado).toBe('verificando');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current.estado).toBe('lento');
  });

  it('resposta rápida nunca passa por lento', async () => {
    jest.useFakeTimers();
    simularRequisicoes(['ok']);
    const { result } = await renderHook(() => usePortaoServidor());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ATRASO_LENTO_MS * 2);
    });
    expect(result.current.estado).toBe('pronto');
  });

  it('falha depois de 90 s (18 tentativas) e tentarDeNovo reinicia', async () => {
    jest.useFakeTimers();
    const requisitar = simularRequisicoes(['falha']);
    const { result } = await renderHook(() => usePortaoServidor());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_SAUDE_MS * TOTAL_TENTATIVAS);
    });
    expect(requisitar).toHaveBeenCalledTimes(TOTAL_TENTATIVAS);
    expect(result.current.estado).toBe('falhou');
    expect(result.current.tentativa).toBe(TOTAL_TENTATIVAS);

    // Não tenta mais sozinho depois de falhar.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_SAUDE_MS * 3);
    });
    expect(requisitar).toHaveBeenCalledTimes(TOTAL_TENTATIVAS);

    await act(async () => {
      result.current.tentarDeNovo();
    });
    // Direto em `lento`: nunca passa por `verificando` (que mostraria o app por 500 ms).
    expect(result.current.estado).toBe('lento');
    expect(result.current.tentativa).toBe(1);
    expect(requisitar).toHaveBeenCalledTimes(TOTAL_TENTATIVAS + 1);
  });

  it('503 vindo do servidor mock também conta como erro', async () => {
    servidor.use(http.get(urlMock('/saude'), () => respostaErro(503, 'indisponível')));
    const { result } = await renderHook(() => usePortaoServidor());
    await waitFor(() => expect(result.current.estado).not.toBe('pronto'));
    expect(['verificando', 'lento']).toContain(result.current.estado);
  });
});
