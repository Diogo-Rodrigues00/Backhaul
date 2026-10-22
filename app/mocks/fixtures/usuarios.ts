// Usuários de mock (ADR 0005). Nada disso existe na API real.
// Qualquer senha com 8 ou mais caracteres entra; o token é fixo por usuário.
import type { TipoUsuario, Usuario } from '../../src/api/tipos';

export type UsuarioMock = {
  email: string;
  token: string;
  tipo: TipoUsuario;
  usuario: Usuario;
  /** Só nos motoristas criados pelo cadastro (só dígitos), para barrar CPF repetido com 409. */
  cpf?: string;
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

// Motoristas criados pelo mock (POST /cadastro/motorista com 201). Ficam só até o processo acabar
// (o Playwright usa um e-mail novo por execução). Assim o login e o GET /eu do usuário criado funcionam.
const cadastradosMock: UsuarioMock[] = [];
let sequenciaCadastroMock = 0;

/** Todos os usuários que o mock conhece: os fixos e os criados pelo cadastro de motorista. */
export function todosUsuariosMock(): UsuarioMock[] {
  return [...usuariosMock, ...cadastradosMock];
}

/** Registra um motorista criado pelo mock e devolve o usuário (token próprio, `mock-cadastrado-N`). */
export function registrarMotoristaMock(
  email: string,
  nome: string,
  cpfDigitos: string,
): UsuarioMock {
  sequenciaCadastroMock += 1;
  const usuario: UsuarioMock = {
    email,
    token: `mock-cadastrado-${sequenciaCadastroMock}`,
    tipo: 'motorista',
    cpf: cpfDigitos,
    usuario: {
      id: `77777777-7777-4777-8777-${String(sequenciaCadastroMock).padStart(12, '0')}`,
      email,
      tipo: 'motorista',
      ativo: true,
      criado_em: new Date().toISOString(),
      nome,
    },
  };
  cadastradosMock.push(usuario);
  return usuario;
}

/** CPF (só dígitos) já usado por um motorista cadastrado pelo mock. */
export function cpfJaCadastradoMock(cpfDigitos: string): boolean {
  return cadastradosMock.some((u) => u.cpf === cpfDigitos);
}
