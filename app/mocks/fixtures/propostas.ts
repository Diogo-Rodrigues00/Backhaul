// POST /propostas, GET /cargas/:id/propostas, POST /propostas/:id/responder (docs/api.md) e
// GET /propostas/minhas (PROPOSTA relatório 4a: ainda não existe no backend).
import type {
  CargaDaMinhaProposta,
  CargaProxima,
  FreteCriado,
  MinhaProposta,
  PropostaCriada,
  PropostaRecebida,
  StatusChamado,
} from '../../src/api/tipos';

import { cargaProximaNormal, cargaProximaUrgente, CARGA_URGENTE_ID } from './cargas';
import { daquiAHoras, dataSemHora } from './datas';
import { DISPONIBILIDADE_ABERTA_ID } from './disponibilidades';

export const PROPOSTA_PENDENTE_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
export const PROPOSTA_ACEITE_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
export const PROPOSTA_RECUSADA_ID = 'bbbbbbbb-0000-4000-8000-000000000003';

/** Resposta do POST /propostas (201): contraproposta pendente. */
export const propostaCriadaMock: PropostaCriada = {
  id: 'bbbbbbbb-0000-4000-8000-000000000004',
  chamado_carga_id: CARGA_URGENTE_ID,
  chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
  tipo: 'contraproposta',
  valor_proposto: 3200,
  status: 'pendente',
  criado_em: daquiAHoras(0),
};

// Pendentes primeiro, depois as mais antigas. A validade aparece nas duas formas que o
// backend pode devolver: `YYYY-MM-DD` (contrato) e ISO com hora (o pg devolve Date).
const validadeIso = '2027-05-01T03:00:00.000Z';

export const propostasDaCargaMock: PropostaRecebida[] = [
  {
    id: PROPOSTA_PENDENTE_ID,
    tipo: 'contraproposta',
    valor_proposto: 3200,
    status: 'pendente',
    criado_em: daquiAHoras(-3),
    motorista: {
      id: '22222222-2222-4222-8222-222222222222',
      nome_completo: 'João da Silva',
      veiculo_tipo: 'carreta',
      veiculo_placa: 'ABC1D23',
      capacidade_kg: 15000,
      certificacoes: [
        {
          nome: 'MOPP - Classe 3 Inflamáveis',
          validade: dataSemHora(validadeIso),
          validado_por_admin: true,
        },
      ],
    },
  },
  {
    id: PROPOSTA_ACEITE_ID,
    tipo: 'aceite',
    valor_proposto: 3500,
    status: 'pendente',
    criado_em: daquiAHoras(-2),
    motorista: {
      id: '44444444-4444-4444-8444-444444444444',
      nome_completo: 'Maria Souza',
      veiculo_tipo: 'truck',
      veiculo_placa: 'XYZ9K88',
      capacidade_kg: 12000,
      certificacoes: [
        { nome: 'MOPP - Classe 3 Inflamáveis', validade: validadeIso, validado_por_admin: false },
      ],
    },
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000005',
    tipo: 'contraproposta',
    valor_proposto: 3300,
    status: 'pendente',
    criado_em: daquiAHoras(-1.5),
    motorista: {
      id: '66666666-6666-4666-8666-666666666666',
      nome_completo: 'Ana Beatriz Rocha',
      veiculo_tipo: 'truck',
      veiculo_placa: 'RTY5U67',
      capacidade_kg: 14000,
      certificacoes: [
        {
          nome: 'MOPP - Classe 3 Inflamáveis',
          validade: dataSemHora(validadeIso),
          validado_por_admin: true,
        },
      ],
    },
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000006',
    tipo: 'aceite',
    valor_proposto: 3500,
    status: 'pendente',
    criado_em: daquiAHoras(-1),
    motorista: {
      id: '77777777-7777-4777-8777-777777777777',
      nome_completo: 'Pedro Henrique Alves',
      veiculo_tipo: 'carreta',
      veiculo_placa: 'LMN7P89',
      capacidade_kg: 20000,
      certificacoes: [],
    },
  },
  {
    id: PROPOSTA_RECUSADA_ID,
    tipo: 'contraproposta',
    valor_proposto: 2900,
    status: 'recusada',
    criado_em: daquiAHoras(-8),
    motorista: {
      id: '55555555-5555-4555-8555-555555555555',
      nome_completo: 'Carlos Lima',
      veiculo_tipo: 'bitrem',
      veiculo_placa: 'QWE4R56',
      capacidade_kg: 30000,
      certificacoes: [],
    },
  },
];

/** Resposta do POST /propostas/:id/responder com `acao: "aceitar"` (200). */
export const freteCriadoMock: FreteCriado = {
  id: 'ffffffff-0000-4000-8000-000000000010',
  proposta_id: PROPOSTA_PENDENTE_ID,
  valor_final: 3200,
  status_entrega: 'aceito',
  criado_em: daquiAHoras(0),
};

function resumoDaCarga(carga: CargaProxima, status: StatusChamado): CargaDaMinhaProposta {
  return {
    id: carga.id,
    tipo_carga: carga.tipo_carga,
    empresa: carga.empresa,
    origem: carga.origem,
    destino: carga.destino,
    valor_oferecido: carga.valor_oferecido,
    urgencia: carga.urgencia,
    status,
    certificacao_exigida: carga.certificacao_exigida,
    expira_em: carga.expira_em,
  };
}

// PROPOSTA relatório 4a. Ordem criado_em DESC. As duas últimas mostram "carga fechou"
// (carga.status 'fechado') sem outra chamada.
export const minhasPropostasMock: MinhaProposta[] = [
  {
    id: PROPOSTA_PENDENTE_ID,
    tipo: 'contraproposta',
    valor_proposto: 3200,
    status: 'pendente',
    criado_em: daquiAHoras(-3),
    disponibilidade_id: DISPONIBILIDADE_ABERTA_ID,
    carga: resumoDaCarga(cargaProximaUrgente, 'aberto'),
  },
  {
    id: PROPOSTA_ACEITE_ID,
    tipo: 'aceite',
    valor_proposto: 4200.5,
    status: 'aceita',
    criado_em: daquiAHoras(-20),
    disponibilidade_id: DISPONIBILIDADE_ABERTA_ID,
    carga: resumoDaCarga(cargaProximaNormal, 'fechado'),
  },
  {
    id: PROPOSTA_RECUSADA_ID,
    tipo: 'contraproposta',
    valor_proposto: 2900,
    status: 'recusada',
    criado_em: daquiAHoras(-30),
    disponibilidade_id: DISPONIBILIDADE_ABERTA_ID,
    carga: resumoDaCarga(cargaProximaUrgente, 'fechado'),
  },
];
