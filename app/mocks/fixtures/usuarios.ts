// Usuários de mock (ADR 0005). Nada disso existe na API real.
// Qualquer senha com 8 ou mais caracteres entra; o token é fixo por usuário.
import type { TipoUsuario, Usuario } from '../../src/api/tipos';

export type UsuarioMock = {
  email: string;
  token: string;
  tipo: TipoUsuario;
  usuario: Usuario;
};

export const TAMANHO_MINIMO_SENHA_MOCK = 8;

export const usuarioEmpresa: UsuarioMock = {
  email: 'empresa@mock.test',
  token: 'mock-empresa',
  tipo: 'empresa',
  usuario: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'empresa@mock.test',
    tipo: 'empresa',
    ativo: true,
    criado_em: '2026-10-14T19:00:00.000Z',
    nome: 'Transportes Rápidos LTDA',
  },
};

export const usuarioMotorista: UsuarioMock = {
  email: 'motorista@mock.test',
  token: 'mock-motorista',
  tipo: 'motorista',
  usuario: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'motorista@mock.test',
    tipo: 'motorista',
    ativo: true,
    criado_em: '2026-10-14T19:00:00.000Z',
    nome: 'João da Silva',
  },
};

export const usuarioAdmin: UsuarioMock = {
  email: 'admin@mock.test',
  token: 'mock-admin',
  tipo: 'admin',
  usuario: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'admin@mock.test',
    tipo: 'admin',
    ativo: true,
    criado_em: '2026-10-14T19:00:00.000Z',
    nome: 'Administrador',
  },
};

export const usuariosMock: UsuarioMock[] = [usuarioEmpresa, usuarioMotorista, usuarioAdmin];

/** E-mail que o mock trata como já cadastrado (409) nos dois cadastros. */
export const EMAIL_JA_CADASTRADO_MOCK = 'existente@mock.test';
