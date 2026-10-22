// Cada hook de recurso: sucesso e ao menos um erro, com o servidor MSW de mocks/node.ts.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import {
  cargasDaEmpresaMock,
  cargasProximasMock,
  CARGA_URGENTE_ID,
} from '../../mocks/fixtures/cargas';
import { certificacoesMock } from '../../mocks/fixtures/certificacoes';
import { DISPONIBILIDADE_ABERTA_ID } from '../../mocks/fixtures/disponibilidades';
import {
  fretesDaEmpresaMock,
  fretesDoMotoristaMock,
  FRETE_ACEITO_ID,
  FRETE_EM_TRANSITO_ID,
  FRETE_ENTREGUE_ID,
} from '../../mocks/fixtures/fretes';
import { PROPOSTA_PENDENTE_ID, PROPOSTA_RECUSADA_ID } from '../../mocks/fixtures/propostas';
import { servidor, urlMock } from '../../mocks/node';
import { respostaErro, respostaHtml } from '../../mocks/respostas';
import {
  criarClienteDeTeste,
  criarEnvoltorio,
  entrarComoMock,
  sairDoMock,
} from '../../mocks/utils-teste';
import { ErroApi } from '@/lib/erros';

import { useCargasProximas, useMinhasCargas, usePublicarCarga } from './cargas';
import { useCertificacoes } from './certificacoes';
import { chaves } from './chaves';
import { useMinhasDisponibilidades } from './disponibilidades';
import { usePublicarDisponibilidade } from './publicarDisponibilidade';
import {
  eFreteDaEmpresa,
  eFreteDoMotorista,
  useAtualizarStatusFrete,
  useMeusFretes,
  usePagarFrete,
} from './fretes';
import {
  useFazerProposta,
  useMinhasPropostas,
  usePropostasDaCarga,
  useResponderProposta,
} from './propostas';
import { useCadastrarEmpresa, useCadastrarMotorista, useEntrar, useEu } from './sessao';

const amanha = () => new Date(Date.now() + 24 * 3_600_000).toISOString();

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

describe('sessao', () => {
  it('useEntrar devolve token e tipo', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEntrar(), { wrapper });
    let resposta;
    await act(async () => {
      resposta = await result.current.mutateAsync({
        email: 'motorista@mock.test',
        senha: 'senha12345',
      });
    });
    expect(resposta).toEqual({ token: 'mock-motorista', tipo: 'motorista' });
  });

  it('useEntrar com senha errada: 401 vira mensagem, não sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    entrarComoMock('mock-empresa', aoSessaoExpirada);
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEntrar(), { wrapper });
    await act(async () => {
      result.current.mutate({ email: 'empresa@mock.test', senha: 'curta' });
    });
    const erro = await esperarErro(result);
    expect(erro.tipo).toBe('mensagem');
    expect(erro.mensagens).toEqual(['email ou senha inválidos']);
    expect(aoSessaoExpirada).not.toHaveBeenCalled();
  });

  it('useEu devolve o usuário do token', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEu(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.usuario).toMatchObject({
      tipo: 'motorista',
      nome: 'João da Silva',
    });
  });

  it('useEu sem token: 401 vira erro de sessão', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEu(), { wrapper });
    const erro = await esperarErro(result);
    expect(erro.tipo).toBe('sessao');
  });

  it('useEu com habilitado=false não chama a API', async () => {
    let chamadas = 0;
    servidor.use(
      http.get(urlMock('/eu'), () => {
        chamadas += 1;
        return HttpResponse.json({});
      }),
    );
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useEu({ habilitado: false }), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(chamadas).toBe(0);
  });

  it('useCadastrarEmpresa: 201 e 409 de e-mail repetido', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCadastrarEmpresa(), { wrapper });
    const dados = {
      email: 'nova@empresa.test',
      senha: 'senha12345',
      razao_social: 'Nova LTDA',
      cnpj: '12.345.678/0001-99',
    };
    await act(async () => {
      await result.current.mutateAsync(dados);
    });
    expect(result.current.data?.usuario).toMatchObject({ tipo: 'empresa', email: dados.email });

    await act(async () => {
      result.current.mutate({ ...dados, email: 'existente@mock.test' });
    });
    const erro = await esperarErro(result);
    expect(erro).toMatchObject({ tipo: 'mensagem', status: 409 });
  });

  it('useCadastrarMotorista: 400 com erros por campo', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCadastrarMotorista(), { wrapper });
    await act(async () => {
      result.current.mutate({
        email: 'novo@motorista.test',
        senha: 'senha12345',
        nome_completo: 'Novo Motorista',
        cpf: '123',
        cnh: '11122233344',
        veiculo_tipo: 'carreta',
        veiculo_placa: 'ABC1D23',
        capacidade_kg: 15000,
      });
    });
    const erro = await esperarErro(result);
    expect(erro.tipo).toBe('validacao');
    expect(erro.mensagens).toEqual(['cpf deve ter 11 dígitos']);
  });

  it('useCadastrarMotorista: 201', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCadastrarMotorista(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        email: 'novo@motorista.test',
        senha: 'senha12345',
        nome_completo: 'Novo Motorista',
        cpf: '123.456.789-01',
        cnh: '11122233344',
        veiculo_tipo: 'carreta',
        veiculo_placa: 'ABC1D23',
        capacidade_kg: 15000,
      });
    });
    expect(result.current.data?.usuario.tipo).toBe('motorista');
  });
});

describe('certificacoes', () => {
  it('useCertificacoes lista as certificações', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoes(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.certificacoes).toEqual(certificacoesMock);
  });

  it('sem token vira erro de sessão', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCertificacoes(), { wrapper });
    expect((await esperarErro(result)).tipo).toBe('sessao');
  });
});

describe('cargas', () => {
  it('usePublicarCarga: 201 e invalida cargas.minhas', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => usePublicarCarga(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        tipo_carga: 'Grãos',
        origem: { lat: -18.9, lng: -48.2 },
        destino: { lat: -19.7, lng: -47.9 },
        peso_kg: 1000,
        valor_oferecido: 500,
        expira_em: amanha(),
      });
    });
    expect(result.current.data?.carga).toMatchObject({ tipo_carga: 'Grãos', urgencia: 'normal' });
    expect(chavesInvalidadas(invalidar)).toEqual([chaves.cargas.minhas()]);
  });

  it('usePublicarCarga: 400 com erros e não invalida', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => usePublicarCarga(), { wrapper });
    await act(async () => {
      result.current.mutate({
        tipo_carga: '',
        origem: { lat: 0, lng: 0 },
        destino: { lat: 0, lng: 0 },
        peso_kg: 0,
        valor_oferecido: 0,
        expira_em: amanha(),
      });
    });
    const erro = await esperarErro(result);
    expect(erro.tipo).toBe('validacao');
    expect(erro.mensagens).toEqual(
      expect.arrayContaining([
        'tipo_carga é obrigatório',
        'peso_kg deve ser um número maior que zero',
      ]),
    );
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('usePublicarCarga como motorista: 403', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => usePublicarCarga(), { wrapper });
    await act(async () => {
      result.current.mutate({
        tipo_carga: 'Grãos',
        origem: { lat: 0, lng: 0 },
        destino: { lat: 0, lng: 0 },
        peso_kg: 1,
        valor_oferecido: 1,
        expira_em: amanha(),
      });
    });
    expect(await esperarErro(result)).toMatchObject({ tipo: 'mensagem', status: 403 });
  });

  it('useMinhasCargas lista as cargas da empresa', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasCargas(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.cargas).toEqual(cargasDaEmpresaMock);
  });

  it('useMinhasCargas: 500 HTML vira falha', async () => {
    entrarComoMock('mock-empresa');
    servidor.use(http.get(urlMock('/cargas/minhas'), () => respostaHtml(500)));
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasCargas(), { wrapper });
    expect((await esperarErro(result)).tipo).toBe('falha');
  });

  it('useCargasProximas envia lat, lng e raio_km', async () => {
    entrarComoMock('mock-motorista');
    let consulta = '';
    servidor.use(
      http.get(urlMock('/cargas/proximas'), ({ request }) => {
        consulta = new URL(request.url).search;
        return HttpResponse.json({ cargas: cargasProximasMock });
      }),
    );
    const { wrapper } = preparar();
    const { result } = await renderHook(
      () => useCargasProximas({ lat: -18.9186, lng: -48.2772, raio_km: 100 }),
      { wrapper },
    );
    await esperarSucesso(result);
    expect(consulta).toBe('?lat=-18.9186&lng=-48.2772&raio_km=100');
    expect(result.current.data?.cargas).toHaveLength(2);
  });

  it('useCargasProximas sem parâmetros fica parada', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useCargasProximas(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useCargasProximas com raio inválido: 400', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(
      () => useCargasProximas({ lat: -18.9, lng: -48.2, raio_km: 900 }),
      { wrapper },
    );
    const erro = await esperarErro(result);
    expect(erro.tipo).toBe('validacao');
    expect(erro.mensagens).toEqual(['raio_km deve ser um número maior que zero e até 500']);
  });
});

describe('disponibilidades', () => {
  it('usePublicarDisponibilidade: 201 e invalida disponibilidades.minhas', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => usePublicarDisponibilidade(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        local: { lat: -18.9186, lng: -48.2772 },
        raio_busca_km: 80,
        expira_em: amanha(),
      });
    });
    expect(result.current.data?.disponibilidade).toMatchObject({ raio_busca_km: 80 });
    expect(chavesInvalidadas(invalidar)).toEqual([chaves.disponibilidades.minhas()]);
  });

  it('usePublicarDisponibilidade: 400', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => usePublicarDisponibilidade(), { wrapper });
    await act(async () => {
      result.current.mutate({ local: { lat: 200, lng: 0 }, expira_em: amanha() });
    });
    expect((await esperarErro(result)).tipo).toBe('validacao');
  });

  it('useMinhasDisponibilidades (proposta 4b) traz o contador de propostas pendentes', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasDisponibilidades(), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.disponibilidades[0]).toMatchObject({
      id: DISPONIBILIDADE_ABERTA_ID,
      propostas_pendentes: 1,
    });
    expect(result.current.data?.disponibilidades[1]?.status).toBe('expirado');
  });

  it('useMinhasDisponibilidades como empresa: 403', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasDisponibilidades(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ status: 403 });
  });
});

describe('propostas', () => {
  it('useFazerProposta: contraproposta, invalida propostas.minhas e cargas.proximas', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useFazerProposta(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        chamado_carga_id: CARGA_URGENTE_ID,
        chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
        tipo: 'contraproposta',
        valor_proposto: 3200,
      });
    });
    expect(result.current.data?.proposta).toMatchObject({
      status: 'pendente',
      valor_proposto: 3200,
    });
    expect(chavesInvalidadas(invalidar)).toEqual([
      chaves.propostas.minhas(),
      chaves.cargas.proximas(),
    ]);
  });

  it('useFazerProposta: contraproposta sem valor é 400', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useFazerProposta(), { wrapper });
    await act(async () => {
      result.current.mutate({
        chamado_carga_id: CARGA_URGENTE_ID,
        chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
        tipo: 'contraproposta',
      });
    });
    expect((await esperarErro(result)).tipo).toBe('validacao');
  });

  it('useFazerProposta: carga fechada é 409', async () => {
    entrarComoMock('mock-motorista');
    servidor.use(
      http.post(urlMock('/propostas'), () =>
        respostaErro(409, 'carga não está mais aberta para propostas'),
      ),
    );
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useFazerProposta(), { wrapper });
    await act(async () => {
      result.current.mutate({
        chamado_carga_id: CARGA_URGENTE_ID,
        chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
        tipo: 'aceite',
      });
    });
    expect(await esperarErro(result)).toMatchObject({
      tipo: 'mensagem',
      status: 409,
      mensagens: ['carga não está mais aberta para propostas'],
    });
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('usePropostasDaCarga lista as propostas da carga', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => usePropostasDaCarga(CARGA_URGENTE_ID), { wrapper });
    await esperarSucesso(result);
    expect(result.current.data?.propostas).toHaveLength(5);
    expect(result.current.data?.propostas[0]?.motorista.certificacoes[0]?.validade).toBe(
      '2027-05-01',
    );
    expect(result.current.data?.propostas[1]?.motorista.certificacoes[0]?.validade).toBe(
      '2027-05-01T03:00:00.000Z',
    );
  });

  it('usePropostasDaCarga de carga alheia: 404', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(
      () => usePropostasDaCarga('ffffffff-ffff-4fff-8fff-ffffffffffff'),
      { wrapper },
    );
    expect(await esperarErro(result)).toMatchObject({ tipo: 'mensagem', status: 404 });
  });

  it('useResponderProposta aceitar: cria frete e invalida daCarga, cargas.minhas e fretes.meus', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useResponderProposta(CARGA_URGENTE_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ propostaId: PROPOSTA_PENDENTE_ID, acao: 'aceitar' });
    });
    expect(result.current.data).toMatchObject({
      frete: { proposta_id: PROPOSTA_PENDENTE_ID, status_entrega: 'aceito' },
    });
    expect(chavesInvalidadas(invalidar)).toEqual([
      chaves.propostas.daCarga(CARGA_URGENTE_ID),
      chaves.cargas.minhas(),
      chaves.fretes.meus(),
    ]);
  });

  it('useResponderProposta recusar', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResponderProposta(CARGA_URGENTE_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ propostaId: PROPOSTA_PENDENTE_ID, acao: 'recusar' });
    });
    expect(result.current.data).toEqual({
      proposta: { id: PROPOSTA_PENDENTE_ID, status: 'recusada' },
    });
  });

  it('useResponderProposta numa proposta já respondida: 409', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useResponderProposta(CARGA_URGENTE_ID), { wrapper });
    await act(async () => {
      result.current.mutate({ propostaId: PROPOSTA_RECUSADA_ID, acao: 'aceitar' });
    });
    expect(await esperarErro(result)).toMatchObject({
      status: 409,
      mensagens: ['proposta já está recusada'],
    });
  });

  it('useMinhasPropostas (proposta 4a) mostra a carga e o status da carga', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasPropostas(), { wrapper });
    await esperarSucesso(result);
    const propostas = result.current.data?.propostas ?? [];
    expect(propostas.map((p) => p.status)).toEqual(['pendente', 'aceita', 'recusada']);
    expect(propostas[0]?.carga).toMatchObject({ status: 'aberto', empresa: expect.any(String) });
    expect(propostas[1]?.carga.status).toBe('fechado');
  });

  it('useMinhasPropostas: 401 vira sessão', async () => {
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMinhasPropostas(), { wrapper });
    expect((await esperarErro(result)).tipo).toBe('sessao');
  });
});

describe('fretes', () => {
  it('useMeusFretes devolve o formato do motorista (com empresa)', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMeusFretes(), { wrapper });
    await esperarSucesso(result);
    const fretes = result.current.data?.fretes ?? [];
    expect(fretes).toEqual(fretesDoMotoristaMock);
    expect(fretes.every(eFreteDoMotorista)).toBe(true);
    expect(fretes.some(eFreteDaEmpresa)).toBe(false);
    expect(fretes[0]).toMatchObject({ coleta_em: null, status_pagamento: null });
  });

  it('useMeusFretes devolve o formato da empresa (com motorista)', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMeusFretes(), { wrapper });
    await esperarSucesso(result);
    const fretes = result.current.data?.fretes ?? [];
    expect(fretes).toEqual(fretesDaEmpresaMock);
    expect(fretes.every(eFreteDaEmpresa)).toBe(true);
  });

  it('useMeusFretes como admin: 403', async () => {
    entrarComoMock('mock-admin');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useMeusFretes(), { wrapper });
    expect(await esperarErro(result)).toMatchObject({ tipo: 'mensagem', status: 403 });
  });

  it('useAtualizarStatusFrete: aceito -> em_transito invalida fretes.meus', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => useAtualizarStatusFrete(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ freteId: FRETE_ACEITO_ID, status: 'em_transito' });
    });
    expect(result.current.data?.frete.status_entrega).toBe('em_transito');
    expect(chavesInvalidadas(invalidar)).toEqual([chaves.fretes.meus()]);
  });

  it('useAtualizarStatusFrete: em_transito -> entregue libera o pagamento', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useAtualizarStatusFrete(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ freteId: FRETE_EM_TRANSITO_ID, status: 'entregue' });
    });
    expect(result.current.data?.frete).toMatchObject({
      status_entrega: 'entregue',
      status_pagamento: 'liberado',
    });
  });

  it('useAtualizarStatusFrete: transição inválida é 409 com a mensagem da API', async () => {
    entrarComoMock('mock-motorista');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => useAtualizarStatusFrete(), { wrapper });
    await act(async () => {
      result.current.mutate({ freteId: FRETE_ENTREGUE_ID, status: 'em_transito' });
    });
    expect(await esperarErro(result)).toMatchObject({
      status: 409,
      mensagens: ['não é possível mudar o frete de entregue para em_transito'],
    });
  });

  it('usePagarFrete: 201 com a comissão devolvida pela API e invalida fretes.meus', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper, invalidar } = preparar();
    const { result } = await renderHook(() => usePagarFrete(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(FRETE_ACEITO_ID);
    });
    expect(result.current.data?.transacao).toMatchObject({
      frete_id: FRETE_ACEITO_ID,
      percentual_comissao: 5,
      valor_comissao: 175,
      status_pagamento: 'retido',
    });
    expect(chavesInvalidadas(invalidar)).toEqual([chaves.fretes.meus()]);
  });

  it('usePagarFrete: frete já pago é 409', async () => {
    entrarComoMock('mock-empresa');
    const { wrapper } = preparar();
    const { result } = await renderHook(() => usePagarFrete(), { wrapper });
    await act(async () => {
      result.current.mutate(FRETE_EM_TRANSITO_ID);
    });
    expect(await esperarErro(result)).toMatchObject({
      status: 409,
      mensagens: ['frete já foi pago'],
    });
  });
});
