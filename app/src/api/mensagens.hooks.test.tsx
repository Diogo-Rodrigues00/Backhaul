// Hooks do chat da proposta, com o servidor MSW de mocks/node.ts: histórico, envio e as recusas do backend.
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { mensagensPorPropostaMock } from '../../mocks/fixtures/mensagens';
import { PROPOSTA_PENDENTE_ID, PROPOSTA_RECUSADA_ID } from '../../mocks/fixtures/propostas';
import { MOTORISTA_JOAO_ID } from '../../mocks/fixtures/usuarios';
import {
  criarClienteDeTeste,
  criarEnvoltorio,
  entrarComoMock,
  sairDoMock,
} from '../../mocks/utils-teste';
import { ErroApi } from '@/lib/erros';

import { chaves } from './chaves';
import { useEnviarMensagem, useMensagens } from './mensagens.hooks';

const MENSAGEM_CONTATO = 'mensagem não pode conter telefone, e-mail ou link';

function preparar() {
  const cliente = criarClienteDeTeste();
  const invalidar = jest.spyOn(cliente, 'invalidateQueries');
  return { cliente, invalidar, wrapper: criarEnvoltorio(cliente) };
}

function chavesInvalidadas(invalidar: jest.SpyInstance): unknown[] {
  return invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey: unknown }).queryKey);
}

async function esperarErro(result: { current: { isError: boolean; error: unknown } }) {
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(ErroApi);
  return result.current.error as ErroApi;
}

beforeEach(() => sairDoMock());
afterEach(() => jest.restoreAllMocks());

describe('useMensagens (histórico)', () => {
  it('devolve o histórico da proposta em ordem cronológica', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMensagens(PROPOSTA_PENDENTE_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mensagens).toEqual(mensagensPorPropostaMock[PROPOSTA_PENDENTE_ID]);
    expect(result.current.data?.mensagens[0]?.texto).toBe(
      'Oi! Você consegue fazer a coleta às 14h?',
    );
  });

  it('lê o histórico de uma proposta recusada (continua disponível)', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMensagens(PROPOSTA_RECUSADA_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mensagens).toHaveLength(1);
  });

  it('id que não é UUID vira 400 com a mensagem da API', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMensagens('abc'), { wrapper });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'validacao',
      status: 400,
      mensagens: ['id deve ser um UUID válido'],
    });
  });

  it('quem não participa da proposta recebe 404 (o admin também)', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMensagens(PROPOSTA_PENDENTE_ID), { wrapper });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'mensagem',
      status: 404,
      mensagens: ['proposta não encontrada'],
    });
  });

  it('motorista de outra proposta recebe o mesmo 404', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMensagens(PROPOSTA_RECUSADA_ID), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ status: 404 });
  });
});

describe('useEnviarMensagem', () => {
  it('201 devolve a mensagem com o remetente do token e invalida o histórico da proposta', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_PENDENTE_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('Combinado, nos vemos lá.');
    });
    expect(result.current.data?.mensagem).toMatchObject({
      proposta_id: PROPOSTA_PENDENTE_ID,
      remetente_id: MOTORISTA_JOAO_ID,
      texto: 'Combinado, nos vemos lá.',
    });
    expect(chavesInvalidadas(invalidar)).toEqual([
      chaves.mensagens.daProposta(PROPOSTA_PENDENTE_ID),
    ]);
  });

  it.each([
    ['telefone', 'me liga 11 99999-9999'],
    ['e-mail', 'manda para joao@exemplo.com'],
    ['arroba por extenso', 'joao arroba exemplo'],
    ['link https', 'confira https://exemplo.org'],
    ['domínio .com', 'acesse loja.com'],
  ])('%s: 400 com a mensagem da API e sem invalidar', async (_, texto) => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_PENDENTE_ID), { wrapper });
    await act(async () => {
      result.current.mutate(texto);
    });
    const erro = await esperarErro(result);
    expect(erro).toMatchObject({ tipo: 'validacao', status: 400 });
    expect(erro.mensagens).toEqual([MENSAGEM_CONTATO]);
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('texto vazio ou só com espaços: 400 "texto é obrigatório"', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_PENDENTE_ID), { wrapper });
    await act(async () => {
      result.current.mutate('   ');
    });
    expect((await esperarErro(result)).mensagens).toEqual(['texto é obrigatório']);
  });

  it('texto com 1001 caracteres: 400 no limite de 1000', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_PENDENTE_ID), { wrapper });
    await act(async () => {
      result.current.mutate('a'.repeat(1001));
    });
    expect((await esperarErro(result)).mensagens).toEqual([
      'texto deve ter no máximo 1000 caracteres',
    ]);
  });

  it('proposta recusada: 409 "proposta encerrada", e nada é invalidado', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_RECUSADA_ID), { wrapper });
    await act(async () => {
      result.current.mutate('Oi, ainda dá para negociar?');
    });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'mensagem',
      status: 409,
      mensagens: ['proposta encerrada: não é possível enviar mensagens'],
    });
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('quem não participa da proposta: 404 (o admin também)', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarMensagem(PROPOSTA_PENDENTE_ID), { wrapper });
    await act(async () => {
      result.current.mutate('Oi');
    });
    expect(await esperarErro(result)).toMatchObject({ status: 404 });
  });
});
