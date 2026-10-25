// Sessão e cadastro (POST /login, GET /eu, POST /cadastro/*). Só as chamadas, sem TanStack Query:
// este módulo entra no JS inicial (sessão e telas públicas). Os hooks ficam em `sessao.hooks.ts`
// (ADR 0004, adendo 2). O token e o estado da sessão ficam em src/state/sessao (card 013).
import { requisitar } from './cliente';
import type {
  CorpoCadastroEmpresa,
  CorpoCadastroMotorista,
  CorpoLogin,
  RespostaCadastro,
  RespostaEu,
  RespostaLogin,
} from './tipos';

/** Login não é autenticado: o 401 dele é "email ou senha inválidos" (mensagem), não sessão expirada. */
export function entrarNaApi(email: string, senha: string): Promise<RespostaLogin> {
  const corpo: CorpoLogin = { email, senha };
  return requisitar<RespostaLogin>('POST', '/login', { corpo, autenticado: false });
}

export function buscarEu(): Promise<RespostaEu> {
  return requisitar<RespostaEu>('GET', '/eu');
}

export function cadastrarEmpresa(dados: CorpoCadastroEmpresa): Promise<RespostaCadastro> {
  return requisitar<RespostaCadastro>('POST', '/cadastro/empresa', {
    corpo: dados,
    autenticado: false,
  });
}

export function cadastrarMotorista(dados: CorpoCadastroMotorista): Promise<RespostaCadastro> {
  return requisitar<RespostaCadastro>('POST', '/cadastro/motorista', {
    corpo: dados,
    autenticado: false,
  });
}
