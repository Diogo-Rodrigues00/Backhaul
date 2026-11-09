// GET /certificacoes (catálogo, ordem alfabética por nome) e as certificações do motorista (contrato).
import type {
  Certificacao,
  CertificacaoPendenteDoContrato,
  MinhaCertificacao,
} from '../../src/api/tipos';
import { daquiAHoras, dataDaquiADias } from './datas';
import { MOTORISTA_JOAO_ID, MOTORISTA_MARIA_ID } from './usuarios';

export const CERT_MOPP_3_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
export const CERT_MOPP_8_ID = 'aaaaaaaa-0000-4000-8000-000000000002';
export const CERT_INDIVISIVEIS_ID = 'aaaaaaaa-0000-4000-8000-000000000003';

export const certificacoesMock: Certificacao[] = [
  {
    id: CERT_MOPP_3_ID,
    nome: 'MOPP - Classe 3 Inflamáveis',
    classificacao_onu: '3',
  },
  {
    id: CERT_MOPP_8_ID,
    nome: 'MOPP - Classe 8 Corrosivos',
    classificacao_onu: '8',
  },
  {
    id: CERT_INDIVISIVEIS_ID,
    nome: 'Transporte de Cargas Indivisíveis',
    classificacao_onu: null,
  },
];

// Ids dos registros do motorista (motorista_certificacoes). Não são os ids do catálogo.
export const MINHA_CERT_APROVADA_ID = 'dddddddd-0000-4000-8000-000000000001';
export const MINHA_CERT_PENDENTE_ID = 'dddddddd-0000-4000-8000-000000000002';
export const MINHA_CERT_VENCIDA_ID = 'dddddddd-0000-4000-8000-000000000003';
/** Id devolvido pelo POST /certificacoes/minhas do mock sem estado (não é gravado). */
export const MINHA_CERT_ENVIADA_ID = 'dddddddd-0000-4000-8000-000000000099';
/** Registro da Maria na fila do admin (sem registro próprio no mock sem estado). */
export const MINHA_CERT_FILA_MARIA_ID = 'dddddddd-0000-4000-8000-000000000011';

/** Validade da certificação pendente do João (a mesma na lista dele e na fila do admin). */
const PENDENTE_VALIDADE = dataDaquiADias(700);

/** GET /certificacoes/minhas do motorista João: uma de cada situação, em ordem alfabética. */
export const minhasCertificacoesMock: MinhaCertificacao[] = [
  {
    id: MINHA_CERT_APROVADA_ID,
    certificacao_id: CERT_MOPP_3_ID,
    nome: 'MOPP - Classe 3 Inflamáveis',
    numero_certificado: '123456',
    validade: dataDaquiADias(900),
    validado_por_admin: true,
    situacao: 'aprovada',
    criado_em: daquiAHoras(-400),
  },
  {
    id: MINHA_CERT_PENDENTE_ID,
    certificacao_id: CERT_MOPP_8_ID,
    nome: 'MOPP - Classe 8 Corrosivos',
    numero_certificado: '654321',
    validade: PENDENTE_VALIDADE,
    validado_por_admin: false,
    situacao: 'pendente',
    criado_em: daquiAHoras(-3),
  },
  {
    id: MINHA_CERT_VENCIDA_ID,
    certificacao_id: CERT_INDIVISIVEIS_ID,
    nome: 'Transporte de Cargas Indivisíveis',
    numero_certificado: '777001',
    validade: dataDaquiADias(-30),
    validado_por_admin: true,
    situacao: 'vencida',
    criado_em: daquiAHoras(-900),
  },
];

/**
 * GET /certificacoes/pendentes, do jeito que o backend responde HOJE: com cpf e cnh. O mock reproduz isso
 * de propósito, para que o teste prove que o app descarta os dois campos. CPFs são válidos (dígitos verificadores).
 * Em ordem: mais antigas primeiro.
 */
export const certificacoesPendentesContratoMock: CertificacaoPendenteDoContrato[] = [
  {
    id: MINHA_CERT_FILA_MARIA_ID,
    certificacao: 'Transporte de Cargas Indivisíveis',
    numero_certificado: '880011',
    validade: dataDaquiADias(600),
    criado_em: daquiAHoras(-10),
    motorista: {
      id: MOTORISTA_MARIA_ID,
      nome_completo: 'Maria Souza',
      cpf: '98765432100',
      cnh: '55566677788',
      veiculo_placa: 'XYZ9K88',
    },
  },
  {
    id: MINHA_CERT_PENDENTE_ID,
    certificacao: 'MOPP - Classe 8 Corrosivos',
    numero_certificado: '654321',
    validade: PENDENTE_VALIDADE,
    criado_em: daquiAHoras(-3),
    motorista: {
      id: MOTORISTA_JOAO_ID,
      nome_completo: 'João da Silva',
      cpf: '52998224725',
      cnh: '11122233344',
      veiculo_placa: 'ABC1D23',
    },
  },
];
