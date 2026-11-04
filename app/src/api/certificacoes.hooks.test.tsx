// Hooks de certificações do motorista e da fila do admin, com o servidor MSW de mocks/node.ts.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import {
  CERT_MOPP_3_ID,
  CERT_MOPP_8_ID,
  MINHA_CERT_FILA_MARIA_ID,
  MINHA_CERT_PENDENTE_ID,
  minhasCertificacoesMock,
} from '../../mocks/fixtures/certificacoes';
import { servidor, urlMock } from '../../mocks/node';
import { respostaErros } from '../../mocks/respostas';
import {
  criarClienteDeTeste,
  criarEnvoltorio,
  entrarComoMock,
  sairDoMock,
} from '../../mocks/utils-teste';
import { ErroApi } from '@/lib/erros';

import { chaves } from './chaves';
import {
  useCertificacoesPendentes,
  useEnviarCertificacao,
  useMinhasCertificacoes,
  useResponderCertificacao,
} from './certificacoes.hooks';

const CPF_DA_FILA = '52998224725';
const CNH_DA_FILA = '11122233344';
const ID_DE_OUTRA_CERTIFICACAO = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

function preparar() {
  const cliente = criarClienteDeTeste();
  const invalidar = jest.spyOn(cliente, 'invalidateQueries');
  return { cliente, invalidar, wrapper: criarEnvoltorio(cliente) };
}

function chavesInvalidadas(invalidar: jest.SpyInstance): unknown[] {
  return invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey: unknown }).queryKey);
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
afterEach(() => jest.restoreAllMocks());

describe('certificações do motorista', () => {
  it('useMinhasCertificacoes lista as três situações, em ordem alfabética', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasCertificacoes(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.certificacoes).toEqual(minhasCertificacoesMock);
    expect(result.current.data?.certificacoes.map((c) => c.situacao)).toEqual([
      'aprovada',
      'pendente',
      'vencida',
    ]);
  });

  it('useMinhasCertificacoes como empresa: 403', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasCertificacoes(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ tipo: 'mensagem', status: 403 });
  });

  it('useEnviarCertificacao: 201 devolve o registro e invalida certificacoes.minhas', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        certificacao_id: CERT_MOPP_8_ID,
        numero_certificado: '999888',
        validade: '2031-01-31',
      });
    });
    expect(result.current.data?.certificacao).toMatchObject({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '999888',
      validade: '2031-01-31',
      validado_por_admin: false,
    });
    expect(chavesInvalidadas(invalidar)).toEqual([chaves.certificacoes.minhas()]);
  });

  it('useEnviarCertificacao: validade no passado é 400 e não invalida nada', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({
        certificacao_id: CERT_MOPP_8_ID,
        numero_certificado: '1',
        validade: '2020-01-01',
      });
    });
    const erro = await esperarErro(result);
    expect(erro).toMatchObject({ tipo: 'validacao', status: 400 });
    expect(erro.mensagens).toEqual(['validade não pode estar no passado']);
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('useEnviarCertificacao: data que não existe no calendário é 400 de formato', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({
        certificacao_id: CERT_MOPP_8_ID,
        numero_certificado: '1',
        validade: '2031-02-31',
      });
    });
    expect((await esperarErro(result)).mensagens).toEqual([
      'validade deve ser uma data válida no formato AAAA-MM-DD',
    ]);
  });

  it('useEnviarCertificacao: número com mais de 60 caracteres é 400', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({
        certificacao_id: CERT_MOPP_8_ID,
        numero_certificado: 'x'.repeat(61),
        validade: '2031-01-31',
      });
    });
    expect((await esperarErro(result)).mensagens).toEqual([
      'numero_certificado deve ter no máximo 60 caracteres',
    ]);
  });

  it('useEnviarCertificacao: certificação do catálogo inexistente é 400', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({
        certificacao_id: ID_DE_OUTRA_CERTIFICACAO,
        numero_certificado: '1',
        validade: '2031-01-31',
      });
    });
    expect((await esperarErro(result)).mensagens).toEqual([
      'certificacao_id não corresponde a nenhuma certificação',
    ]);
  });

  it('useEnviarCertificacao: MOPP já aprovado e vigente é 409 (não se troca a aprovação)', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEnviarCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({
        certificacao_id: CERT_MOPP_3_ID,
        numero_certificado: '123456',
        validade: '2030-05-01',
      });
    });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'mensagem',
      status: 409,
      mensagens: ['certificação já aprovada e dentro da validade'],
    });
  });
});

describe('fila do admin de certificações', () => {
  it('useCertificacoesPendentes: cpf e cnh do contrato não chegam às telas', async () => {
    entrarComoMock('mock-admin');
    servidor.use(
      http.get(urlMock('/certificacoes/pendentes'), () =>
        HttpResponse.json({
          certificacoes: [
            {
              id: MINHA_CERT_PENDENTE_ID,
              certificacao: 'MOPP - Classe 8 Corrosivos',
              numero_certificado: '654321',
              validade: '2030-11-20',
              criado_em: '2026-11-03T10:00:00.000Z',
              motorista: {
                id: '22222222-2222-4222-8222-222222222222',
                nome_completo: 'João da Silva',
                cpf: CPF_DA_FILA,
                cnh: CNH_DA_FILA,
                veiculo_placa: 'ABC1D23',
              },
            },
          ],
        }),
      ),
    );
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoesPendentes(), { wrapper });
    await esperarSucesso(result);

    // Só os campos permitidos: nem a chave "cpf" nem a "cnh" sobrevivem ao parse.
    expect(result.current.data?.certificacoes[0]).toEqual({
      id: MINHA_CERT_PENDENTE_ID,
      certificacao: 'MOPP - Classe 8 Corrosivos',
      numero_certificado: '654321',
      validade: '2030-11-20',
      criado_em: '2026-11-03T10:00:00.000Z',
      motorista: {
        id: '22222222-2222-4222-8222-222222222222',
        nome_completo: 'João da Silva',
        veiculo_placa: 'ABC1D23',
      },
    });
    expect(result.current.data?.certificacoes[0]?.motorista).not.toHaveProperty('cpf');
    expect(result.current.data?.certificacoes[0]?.motorista).not.toHaveProperty('cnh');
    const texto = JSON.stringify(result.current.data);
    expect(texto).not.toContain(CPF_DA_FILA);
    expect(texto).not.toContain(CNH_DA_FILA);
  });

  it('useCertificacoesPendentes com o mock padrão (que traz cpf e cnh) também não os expõe', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoesPendentes(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.certificacoes.map((c) => c.id)).toEqual([
      MINHA_CERT_FILA_MARIA_ID,
      MINHA_CERT_PENDENTE_ID,
    ]);
    expect(JSON.stringify(result.current.data)).not.toMatch(/cpf|cnh|52998224725|11122233344/);
  });

  it('useCertificacoesPendentes como motorista: 403', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoesPendentes(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ status: 403 });
  });

  it('useCertificacoesPendentes: resposta sem a lista vira falha, não erro de JavaScript', async () => {
    entrarComoMock('mock-admin');
    servidor.use(http.get(urlMock('/certificacoes/pendentes'), () => HttpResponse.json({})));
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoesPendentes(), { wrapper });
    expect((await esperarErro(result)).tipo).toBe('falha');
  });

  it('useResponderCertificacao aprovar: 200 e invalida a fila e o resumo do admin', async () => {
    entrarComoMock('mock-admin');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useResponderCertificacao(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        certificacaoId: MINHA_CERT_FILA_MARIA_ID,
        acao: 'aprovar',
      });
    });
    expect(result.current.data).toEqual({
      certificacao: { id: MINHA_CERT_FILA_MARIA_ID, validado_por_admin: true },
    });
    expect(chavesInvalidadas(invalidar)).toEqual([
      chaves.certificacoes.pendentes(),
      chaves.admin.resumo(),
    ]);
  });

  it('useResponderCertificacao recusar: 200 com recusada', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResponderCertificacao(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        certificacaoId: MINHA_CERT_FILA_MARIA_ID,
        acao: 'recusar',
      });
    });
    expect(result.current.data).toEqual({
      certificacao: { id: MINHA_CERT_FILA_MARIA_ID, recusada: true },
    });
  });

  it('useResponderCertificacao já decidida (404): avisa e ainda pede a fila de novo', async () => {
    entrarComoMock('mock-admin');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useResponderCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({ certificacaoId: ID_DE_OUTRA_CERTIFICACAO, acao: 'aprovar' });
    });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'mensagem',
      status: 404,
      mensagens: ['certificação pendente não encontrada'],
    });
    await waitFor(() =>
      expect(chavesInvalidadas(invalidar)).toEqual([
        chaves.certificacoes.pendentes(),
        chaves.admin.resumo(),
      ]),
    );
  });

  it('useResponderCertificacao com ação inválida: 400 com a mensagem da API', async () => {
    entrarComoMock('mock-admin');
    servidor.use(
      http.post(urlMock('/certificacoes/pendentes/:id/responder'), () =>
        respostaErros(400, ['acao deve ser aprovar ou recusar']),
      ),
    );
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResponderCertificacao(), { wrapper });
    await act(async () => {
      result.current.mutate({ certificacaoId: MINHA_CERT_FILA_MARIA_ID, acao: 'aprovar' });
    });
    expect((await esperarErro(result)).mensagens).toEqual(['acao deve ser aprovar ou recusar']);
  });
});
