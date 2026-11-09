// Chat da proposta (GET /propostas/:id/mensagens). Quem participa de cada proposta e o histórico de exemplo.
import type { Mensagem, StatusProposta } from '../../src/api/tipos';
import { daquiAHoras } from './datas';
import {
  PROPOSTA_ACEITE_ID,
  PROPOSTA_EXPIRADA_JOAO_ID,
  PROPOSTA_PENDENTE_ID,
  PROPOSTA_RECUSADA_ID,
  PROPOSTA_RECUSADA_JOAO_ID,
} from './propostas';
import { EMPRESA_ID_MOCK, MOTORISTA_CARLOS_ID, MOTORISTA_JOAO_ID } from './usuarios';

export type ParticipantesProposta = {
  /** Id do usuário da empresa dona da carga. */
  empresa: string;
  /** Id do usuário do motorista da proposta. */
  motorista: string;
  status: StatusProposta;
};

/** Quem pode ler e escrever no chat de cada proposta (fora desta lista, o mock responde 404). */
export const PARTICIPANTES_PROPOSTA_MOCK: Record<string, ParticipantesProposta> = {
  [PROPOSTA_PENDENTE_ID]: {
    empresa: EMPRESA_ID_MOCK,
    motorista: MOTORISTA_JOAO_ID,
    status: 'pendente',
  },
  [PROPOSTA_ACEITE_ID]: {
    empresa: EMPRESA_ID_MOCK,
    motorista: MOTORISTA_JOAO_ID,
    status: 'aceita',
  },
  [PROPOSTA_RECUSADA_ID]: {
    empresa: EMPRESA_ID_MOCK,
    motorista: MOTORISTA_CARLOS_ID,
    status: 'recusada',
  },
  // Propostas do João que "Minhas propostas" também lista (a recusada e a expirada, card 043).
  [PROPOSTA_RECUSADA_JOAO_ID]: {
    empresa: EMPRESA_ID_MOCK,
    motorista: MOTORISTA_JOAO_ID,
    status: 'recusada',
  },
  [PROPOSTA_EXPIRADA_JOAO_ID]: {
    empresa: EMPRESA_ID_MOCK,
    motorista: MOTORISTA_JOAO_ID,
    status: 'expirada',
  },
};

const EMPRESA = EMPRESA_ID_MOCK;
const MOTORISTA = MOTORISTA_JOAO_ID;

/** Histórico de exemplo, em ordem cronológica. Sem números longos nos textos (o filtro recusaria). */
export const mensagensPorPropostaMock: Record<string, Mensagem[]> = {
  [PROPOSTA_PENDENTE_ID]: [
    {
      id: 'eeeeeeee-0000-4000-8000-000000000001',
      remetente_id: EMPRESA,
      texto: 'Oi! Você consegue fazer a coleta às 14h?',
      criado_em: daquiAHoras(-2),
    },
    {
      id: 'eeeeeeee-0000-4000-8000-000000000002',
      remetente_id: MOTORISTA,
      texto: 'Consigo sim. Chego na coleta às 14h.',
      criado_em: daquiAHoras(-1.5),
    },
    {
      id: 'eeeeeeee-0000-4000-8000-000000000003',
      remetente_id: EMPRESA,
      texto: 'Combinado, portão 2.',
      criado_em: daquiAHoras(-1),
    },
  ],
  [PROPOSTA_RECUSADA_ID]: [
    {
      id: 'eeeeeeee-0000-4000-8000-000000000004',
      remetente_id: EMPRESA,
      texto: 'Obrigado pela proposta, mas fechamos com outro motorista.',
      criado_em: daquiAHoras(-7),
    },
  ],
  [PROPOSTA_RECUSADA_JOAO_ID]: [
    {
      id: 'eeeeeeee-0000-4000-8000-000000000005',
      remetente_id: EMPRESA,
      texto: 'Agradecemos o interesse, mas a carga seguiu com outro motorista.',
      criado_em: daquiAHoras(-69),
    },
  ],
};
