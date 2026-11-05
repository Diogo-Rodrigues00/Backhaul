// Mock COM ESTADO (comEstado.ts), o mesmo que o E2E usa: prova os dois fluxos da Fase 6.0 de ponta a ponta,
// pelos fetchers reais do app. Cada teste começa com o mundo reiniciado (POST /__mock/reset).
import { configurarCliente, requisitar } from '@/api/cliente';
import { obterResumoAdmin } from '@/api/admin';
import {
  enviarCertificacao,
  listarCertificacoesPendentes,
  listarMinhasCertificacoes,
  responderCertificacaoPendente,
} from '@/api/certificacoes';
import { enviarMensagem, listarMensagens } from '@/api/mensagens';
import { fazerProposta, responderProposta } from '@/api/propostas';
import { publicarDisponibilidade } from '@/api/publicarDisponibilidade';
import { cadastrarMotorista, entrarNaApi } from '@/api/sessao';

import { servidor, URL_BASE_TESTE } from '../node';
import { ID_CARGA_GRAOS_FLUXO } from '../estado';
import { CERT_MOPP_3_ID, CERT_MOPP_8_ID } from '../fixtures/certificacoes';
import { dataDaquiADias } from '../fixtures/datas';

import { criarHandlersComEstado } from './comEstado';

const CPF_NOVO = '52998224725';
const CNH_NOVA = '11122233344';

async function entrarComo(email: string): Promise<void> {
  const { token } = await entrarNaApi(email, 'senha12345');
  configurarCliente({ obterToken: () => token, aoSessaoExpirada: () => undefined });
}

async function cadastrarPedro(): Promise<void> {
  await cadastrarMotorista({
    email: 'pedro@fluxo.test',
    senha: 'senha12345',
    nome_completo: 'Pedro Teste',
    cpf: CPF_NOVO,
    cnh: CNH_NOVA,
    veiculo_tipo: 'carreta',
    veiculo_placa: 'ABC1D23',
    capacidade_kg: 15000,
  });
}

const amanha = () => new Date(Date.now() + 24 * 3_600_000).toISOString();

beforeEach(async () => {
  servidor.use(...criarHandlersComEstado(URL_BASE_TESTE));
  await requisitar('POST', '/__mock/reset', { autenticado: false });
});

describe('certificação: motorista envia, admin decide, situação muda', () => {
  it('cadastro → envio pendente → admin aprova → situação "aprovada"', async () => {
    await cadastrarPedro();
    await entrarComo('pedro@fluxo.test');
    const enviada = await enviarCertificacao({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '777888',
      validade: dataDaquiADias(800),
    });
    expect((await listarMinhasCertificacoes()).certificacoes).toEqual([
      expect.objectContaining({
        id: enviada.certificacao.id,
        nome: 'MOPP - Classe 8 Corrosivos',
        situacao: 'pendente',
        validado_por_admin: false,
      }),
    ]);

    await entrarComo('admin@fluxo.test');
    const fila = await listarCertificacoesPendentes();
    const daFila = fila.certificacoes.find((c) => c.id === enviada.certificacao.id);
    expect(daFila).toMatchObject({
      certificacao: 'MOPP - Classe 8 Corrosivos',
      numero_certificado: '777888',
      motorista: { nome_completo: 'Pedro Teste', veiculo_placa: 'ABC1D23' },
    });
    // A fila do mock traz cpf e cnh (como o backend); o app não pode deixá-los passar.
    expect(
      fila.certificacoes.every((c) => !('cpf' in c.motorista) && !('cnh' in c.motorista)),
    ).toBe(true);
    expect(JSON.stringify(fila)).not.toContain(CPF_NOVO);
    expect(JSON.stringify(fila)).not.toContain(CNH_NOVA);

    const decisao = await responderCertificacaoPendente(enviada.certificacao.id, 'aprovar');
    expect(decisao).toEqual({
      certificacao: { id: enviada.certificacao.id, validado_por_admin: true },
    });
    expect((await listarCertificacoesPendentes()).certificacoes.map((c) => c.id)).not.toContain(
      enviada.certificacao.id,
    );

    await entrarComo('pedro@fluxo.test');
    expect((await listarMinhasCertificacoes()).certificacoes).toEqual([
      expect.objectContaining({ id: enviada.certificacao.id, situacao: 'aprovada' }),
    ]);
  });

  it('reenvio de pendente volta para pendente no mesmo registro; aprovada e vigente dá 409', async () => {
    await entrarComo('joao@fluxo.test');
    await expect(
      enviarCertificacao({
        certificacao_id: CERT_MOPP_3_ID,
        numero_certificado: '999',
        validade: dataDaquiADias(800),
      }),
    ).rejects.toMatchObject({
      tipo: 'mensagem',
      status: 409,
      mensagens: ['certificação já aprovada e dentro da validade'],
    });

    const primeiro = await enviarCertificacao({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '111',
      validade: dataDaquiADias(800),
    });
    const reenviada = await enviarCertificacao({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '222',
      validade: dataDaquiADias(1100),
    });
    expect(reenviada.certificacao).toMatchObject({
      id: primeiro.certificacao.id,
      numero_certificado: '222',
      validado_por_admin: false,
    });
  });

  it('admin recusa: o registro some e o motorista pode reenviar', async () => {
    await entrarComo('joao@fluxo.test');
    const enviada = await enviarCertificacao({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '333',
      validade: dataDaquiADias(800),
    });

    await entrarComo('admin@fluxo.test');
    const recusa = await responderCertificacaoPendente(enviada.certificacao.id, 'recusar');
    expect(recusa).toEqual({ certificacao: { id: enviada.certificacao.id, recusada: true } });
    await expect(
      responderCertificacaoPendente(enviada.certificacao.id, 'aprovar'),
    ).rejects.toMatchObject({ status: 404, mensagens: ['certificação pendente não encontrada'] });

    await entrarComo('joao@fluxo.test');
    expect((await listarMinhasCertificacoes()).certificacoes.map((c) => c.id)).not.toContain(
      enviada.certificacao.id,
    );
    await expect(
      enviarCertificacao({
        certificacao_id: CERT_MOPP_8_ID,
        numero_certificado: '444',
        validade: dataDaquiADias(800),
      }),
    ).resolves.toMatchObject({ certificacao: { numero_certificado: '444' } });
  });

  it('admin: resumo conta a certificação pendente; o motorista não lê o resumo', async () => {
    await cadastrarPedro();
    await entrarComo('pedro@fluxo.test');
    await enviarCertificacao({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '555',
      validade: dataDaquiADias(800),
    });
    await entrarComo('admin@fluxo.test');
    expect((await obterResumoAdmin()).resumo).toMatchObject({
      motoristas: 2,
      certificacoes_pendentes: 1,
    });
    await entrarComo('pedro@fluxo.test');
    await expect(obterResumoAdmin()).rejects.toMatchObject({ status: 403 });
  });
});

describe('chat da proposta: histórico, filtro, encerramento', () => {
  it('motorista e empresa conversam; filtro recusa contato; recusa encerra; histórico continua', async () => {
    await entrarComo('joao@fluxo.test');
    const disponibilidade = await publicarDisponibilidade({
      local: { lat: -18.9186, lng: -48.2772 },
      raio_busca_km: 80,
      expira_em: amanha(),
    });
    const proposta = await fazerProposta({
      chamado_carga_id: ID_CARGA_GRAOS_FLUXO,
      chamado_disp_id: disponibilidade.disponibilidade.id,
      tipo: 'contraproposta',
      valor_proposto: 4000,
    });
    const propostaId = proposta.proposta.id;

    const doMotorista = await enviarMensagem(propostaId, 'Chego na coleta às 14h.');
    expect(doMotorista.mensagem).toMatchObject({
      proposta_id: propostaId,
      texto: 'Chego na coleta às 14h.',
    });

    await entrarComo('empresa@fluxo.test');
    expect((await listarMensagens(propostaId)).mensagens.map((m) => m.texto)).toEqual([
      'Chego na coleta às 14h.',
    ]);
    await enviarMensagem(propostaId, 'Combinado, portão 2.');
    await expect(enviarMensagem(propostaId, 'me liga 11 99999-9999')).rejects.toMatchObject({
      tipo: 'validacao',
      status: 400,
      mensagens: ['mensagem não pode conter telefone, e-mail ou link'],
    });

    await entrarComo('admin@fluxo.test');
    await expect(listarMensagens(propostaId)).rejects.toMatchObject({
      status: 404,
      mensagens: ['proposta não encontrada'],
    });

    await entrarComo('empresa@fluxo.test');
    await responderProposta(propostaId, 'recusar');
    await expect(enviarMensagem(propostaId, 'Ainda dá para fechar?')).rejects.toMatchObject({
      tipo: 'mensagem',
      status: 409,
      mensagens: ['proposta encerrada: não é possível enviar mensagens'],
    });
    expect((await listarMensagens(propostaId)).mensagens).toHaveLength(2);
  });
});
