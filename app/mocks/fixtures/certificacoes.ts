// GET /certificacoes: ordem alfabética por nome (contrato).
import type { Certificacao } from '../../src/api/tipos';

export const certificacoesMock: Certificacao[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    nome: 'MOPP - Classe 3 Inflamáveis',
    classificacao_onu: '3',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    nome: 'MOPP - Classe 8 Corrosivos',
    classificacao_onu: '8',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    nome: 'Transporte de Cargas Indivisíveis',
    classificacao_onu: null,
  },
];
