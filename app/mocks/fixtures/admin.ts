// Painel do admin (GET /admin/resumo, /admin/fretes, /admin/usuarios). Valores de comissão são os que a
// API devolveria: o app os exibe como vêm, e o mock não tem nenhuma regra de percentual.
import type { FreteAdmin, ResumoAdmin, UsuarioAdmin } from '../../src/api/tipos';
import { daquiAHoras } from './datas';
import { ADMIN_ID_MOCK, EMPRESA_ID_MOCK, MOTORISTA_JOAO_ID, MOTORISTA_MARIA_ID } from './usuarios';

export const resumoAdminMock: ResumoAdmin = {
  motoristas: 2,
  empresas: 1,
  cargas_abertas: 3,
  propostas_pendentes: 1,
  fretes_aceitos: 1,
  fretes_em_transito: 1,
  fretes_entregues: 1,
  certificacoes_pendentes: 2,
  volume_liberado: 3500,
  comissao_total: 175,
  comissao_retida: 160,
};

export const fretesAdminMock: FreteAdmin[] = [
  {
    id: 'ffffffff-0000-4000-8000-000000000101',
    tipo_carga: 'Grãos',
    valor_final: 3500,
    status_entrega: 'entregue',
    coleta_em: daquiAHoras(-30),
    entrega_em: daquiAHoras(-20),
    criado_em: daquiAHoras(-40),
    empresa: 'Transportes Rápidos LTDA',
    motorista: 'João da Silva',
    veiculo_placa: 'ABC1D23',
    status_pagamento: 'liberado',
    valor_comissao: 175,
  },
  {
    id: 'ffffffff-0000-4000-8000-000000000102',
    tipo_carga: 'Produtos inflamáveis',
    valor_final: 3200,
    status_entrega: 'em_transito',
    coleta_em: daquiAHoras(-2),
    entrega_em: null,
    criado_em: daquiAHoras(-5),
    empresa: 'Transportes Rápidos LTDA',
    motorista: 'João da Silva',
    veiculo_placa: 'ABC1D23',
    status_pagamento: 'retido',
    valor_comissao: 160,
  },
  {
    id: 'ffffffff-0000-4000-8000-000000000103',
    tipo_carga: 'Material de construção',
    valor_final: 2800,
    status_entrega: 'aceito',
    coleta_em: null,
    entrega_em: null,
    criado_em: daquiAHoras(-1),
    empresa: 'Casa Forte Atacado',
    motorista: 'Maria Souza',
    veiculo_placa: 'XYZ9K88',
    status_pagamento: null,
    valor_comissao: null,
  },
];

export const usuariosAdminMock: UsuarioAdmin[] = [
  {
    id: ADMIN_ID_MOCK,
    email: 'admin@mock.test',
    tipo: 'admin',
    ativo: true,
    criado_em: daquiAHoras(-500),
    nome: null,
  },
  {
    id: EMPRESA_ID_MOCK,
    email: 'empresa@mock.test',
    tipo: 'empresa',
    ativo: true,
    criado_em: daquiAHoras(-480),
    nome: 'Transportes Rápidos LTDA',
  },
  {
    id: MOTORISTA_JOAO_ID,
    email: 'motorista@mock.test',
    tipo: 'motorista',
    ativo: true,
    criado_em: daquiAHoras(-470),
    nome: 'João da Silva',
  },
  {
    id: MOTORISTA_MARIA_ID,
    email: 'maria@mock.test',
    tipo: 'motorista',
    ativo: false,
    criado_em: daquiAHoras(-20),
    nome: 'Maria Souza',
  },
];
