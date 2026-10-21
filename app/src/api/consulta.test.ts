import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { ErroApi } from '@/lib/erros';

import {
  criarQueryClient,
  INTERVALO_ATUALIZACAO_MS,
  opcoesDeLeitura,
  repetirConsulta,
} from './consulta';
import { configurarFoco } from './foco.native';

describe('QueryClient (ADR 0004)', () => {
  it('usa os padrões combinados', () => {
    const padroes = criarQueryClient().getDefaultOptions();
    expect(padroes.queries).toMatchObject({
      staleTime: 5_000,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
    });
    expect(padroes.mutations).toMatchObject({ retry: 0 });
  });

  it('repete uma vez falhas passageiras e nunca um 4xx', () => {
    expect(repetirConsulta(0, ErroApi.falha(500))).toBe(true);
    expect(repetirConsulta(0, ErroApi.falha())).toBe(true);
    expect(repetirConsulta(1, ErroApi.falha(500))).toBe(false);
    expect(
      repetirConsulta(0, new ErroApi({ tipo: 'mensagem', status: 409, mensagens: ['x'] })),
    ).toBe(false);
  });
});

describe('opcoesDeLeitura', () => {
  it('sem opções: habilitado e sem intervalo', () => {
    expect(opcoesDeLeitura()).toEqual({ enabled: true, refetchInterval: false });
  });

  it('automatico liga o intervalo de 10 s e habilitado=false para a consulta', () => {
    expect(opcoesDeLeitura({ automatico: true, habilitado: false })).toEqual({
      enabled: false,
      refetchInterval: INTERVALO_ATUALIZACAO_MS,
    });
    expect(INTERVALO_ATUALIZACAO_MS).toBe(10_000);
  });
});

describe('foco no iPhone (AppState)', () => {
  afterEach(() => {
    focusManager.setEventListener(() => () => undefined);
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
  });

  it('segundo plano tira o foco e voltar a "active" devolve', () => {
    let ouvinte: (estado: AppStateStatus) => void = () => undefined;
    const remover = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, funcao) => {
      ouvinte = funcao as (estado: AppStateStatus) => void;
      return { remove: remover };
    });

    configurarFoco();

    ouvinte('background');
    expect(focusManager.isFocused()).toBe(false);
    ouvinte('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});
