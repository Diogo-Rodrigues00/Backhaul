// Hooks do admin (só leitura), com o servidor MSW de mocks/node.ts: resumo, fretes e usuários.
import { renderHook, waitFor } from '@testing-library/react-native';

import { fretesAdminMock, resumoAdminMock } from '../../mocks/fixtures/admin';
import {
  criarClienteDeTeste,
  criarEnvoltorio,
  entrarComoMock,
  sairDoMock,
} from '../../mocks/utils-teste';
import { ErroApi } from '@/lib/erros';

import { useFretesAdmin, useResumoAdmin, useUsuariosAdmin } from './admin.hooks';

function preparar() {
  return { wrapper: criarEnvoltorio(criarClienteDeTeste()) };
}

async function esperarSucesso(result: { current: { isSuccess: boolean } }) {
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
}

async function esperarErro(result: { current: { isError: boolean; error: unknown } }) {
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(ErroApi);
  return result.current.error as ErroApi;
}

beforeEach(() => sairDoMock());

describe('useResumoAdmin', () => {
  it('devolve os números e a comissão exatamente como a API manda (sem recalcular)', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResumoAdmin(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.resumo).toEqual(resumoAdminMock);
    expect(result.current.data?.resumo.comissao_total).toBe(175);
    expect(result.current.data?.resumo.comissao_retida).toBe(160);
  });

  it('motorista não lê o resumo: 403', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResumoAdmin(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ tipo: 'mensagem', status: 403 });
  });

  it('sem token: 401 vira erro de sessão', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResumoAdmin(), { wrapper });
    expect((await esperarErro(result)).tipo).toBe('sessao');
  });
});

describe('useFretesAdmin', () => {
  it('traz pagamento e comissão como null enquanto a empresa não pagou', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useFretesAdmin(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.fretes).toEqual(fretesAdminMock);
    const naoPago = result.current.data?.fretes.find((f) => f.status_entrega === 'aceito');
    expect(naoPago).toMatchObject({ status_pagamento: null, valor_comissao: null });
  });

  it('empresa não lê a lista de fretes do admin: 403', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useFretesAdmin(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ status: 403 });
  });
});

describe('useUsuariosAdmin', () => {
  it('o admin vem com nome null e a lista não traz documentos nem senha', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useUsuariosAdmin(), { wrapper });
    await esperarSucesso(result);
    const admin = result.current.data?.usuarios.find((u) => u.tipo === 'admin');
    expect(admin?.nome).toBeNull();
    const texto = JSON.stringify(result.current.data);
    expect(texto).not.toMatch(/cpf|cnpj|senha/i);
  });

  it('motorista não lê a lista de usuários: 403', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useUsuariosAdmin(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ status: 403 });
  });
});
