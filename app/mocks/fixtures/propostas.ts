// POST /propostas, GET /cargas/:id/propostas, POST /propostas/:id/responder (docs/api.md) e
// GET /propostas/minhas.
import type {
  FreteCriado,
  MinhaProposta,
  PropostaCriada,
  PropostaRecebida,
} from '../../src/api/tipos';

import { cargaProximaNormal, cargaProximaUrgente, CARGA_URGENTE_ID } from './cargas';
import { daquiAHoras, dataSemHora } from './datas';
import { DISPONIBILIDADE_ABERTA_ID } from './disponibilidades';
import { FRETE_ACEITO_ID } from './fretes';

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

/** Uma linha de GET /propostas/minhas no formato real, para os testes variarem só o que importa. */
export function minhaPropostaMock(parcial: Partial<MinhaProposta> = {}): MinhaProposta {
  return {
    id: 'bbbbbbbb-0000-4000-8000-0000000000a0',
    tipo: 'aceite',
    valor_proposto: cargaProximaNormal.valor_oferecido,
    status: 'pendente',
    criado_em: '2026-10-21T12:00:00.000Z',
    chamado_carga_id: cargaProximaNormal.id,
    chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
    tipo_carga: cargaProximaNormal.tipo_carga,
    valor_oferecido: cargaProximaNormal.valor_oferecido,
    empresa: cargaProximaNormal.empresa,
    frete_id: null,
    ...parcial,
  };
}

// Formato real de GET /propostas/minhas (docs/api.md): plano, `criado_em` DESC. A aceita traz o
// `frete_id` do frete criado no aceite; as demais, `null`.
export const minhasPropostasMock: MinhaProposta[] = [
  {
    id: PROPOSTA_PENDENTE_ID,
    tipo: 'contraproposta',
    valor_proposto: 3200,
    status: 'pendente',
    criado_em: daquiAHoras(-3),
    chamado_carga_id: cargaProximaUrgente.id,
    chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
    tipo_carga: cargaProximaUrgente.tipo_carga,
    valor_oferecido: cargaProximaUrgente.valor_oferecido,
    empresa: cargaProximaUrgente.empresa,
    frete_id: null,
  },
  {
    id: PROPOSTA_ACEITE_ID,
    tipo: 'aceite',
    valor_proposto: 4200.5,
    status: 'aceita',
    criado_em: daquiAHoras(-20),
    chamado_carga_id: cargaProximaNormal.id,
    chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
    tipo_carga: cargaProximaNormal.tipo_carga,
    valor_oferecido: cargaProximaNormal.valor_oferecido,
    empresa: cargaProximaNormal.empresa,
    frete_id: FRETE_ACEITO_ID,
  },
  {
    id: PROPOSTA_RECUSADA_ID,
    tipo: 'contraproposta',
    valor_proposto: 2900,
    status: 'recusada',
    criado_em: daquiAHoras(-30),
    chamado_carga_id: cargaProximaUrgente.id,
    chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
    tipo_carga: cargaProximaUrgente.tipo_carga,
    valor_oferecido: cargaProximaUrgente.valor_oferecido,
    empresa: cargaProximaUrgente.empresa,
    frete_id: null,
  },
];
