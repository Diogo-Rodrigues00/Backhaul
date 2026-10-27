// Peças comuns dos handlers: autenticação por token de mock, leitura segura do corpo e ids fixos.
import type { TipoUsuario } from '../../src/api/tipos';
import { todosUsuariosMock, type UsuarioMock } from '../fixtures/usuarios';
import { respostaErro } from '../respostas';

/** Id de qualquer recurso que o mock deve tratar como inexistente (404). */
export const ID_INEXISTENTE_MOCK = '00000000-0000-4000-8000-000000000000';

export type ResultadoAutenticacao =
  | { usuario: UsuarioMock; resposta?: undefined }
  | { usuario?: undefined; resposta: ReturnType<typeof respostaErro> };

/**
 * Confere o Bearer (mock-empresa, mock-motorista, mock-admin) e, se `permitidos` vier, o tipo.
 * Mensagens e códigos iguais aos do backend: 401 sem token/inválido, 403 tipo errado.
 */
export function autenticar(request: Request, permitidos?: TipoUsuario[]): ResultadoAutenticacao {
  const cabecalho = request.headers.get('Authorization');
  if (cabecalho === null || !cabecalho.startsWith('Bearer ')) {
    return { resposta: respostaErro(401, 'token ausente') };
  }
  const token = cabecalho.slice('Bearer '.length);
  const usuario = todosUsuariosMock().find((u) => u.token === token);
  if (usuario === undefined) {
    return { resposta: respostaErro(401, 'token inválido ou expirado') };
  }
  if (permitidos !== undefined && !permitidos.includes(usuario.tipo)) {
    return { resposta: respostaErro(403, 'acesso negado para este tipo de usuário') };
  }
  return { usuario };
}

/** Corpo JSON como objeto; qualquer outra coisa vira `{}` (a validação então acusa os campos). */
export async function lerCorpo(request: Request): Promise<Record<string, unknown>> {
  try {
    const corpo: unknown = await request.json();
    return typeof corpo === 'object' && corpo !== null && !Array.isArray(corpo)
      ? (corpo as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function textoOuVazio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function eNumeroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

export function eDataFutura(valor: unknown): boolean {
  if (typeof valor !== 'string') {
    return false;
  }
  const tempo = Date.parse(valor);
  return Number.isFinite(tempo) && tempo > Date.now();
}
