// Sessão e cadastro (POST /login, GET /eu, POST /cadastro/*). O token e o estado da
// sessão ficam em src/state/sessao (card 013); aqui só há as chamadas e os hooks.
import { useMutation, useQuery } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
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

export function useEu(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.eu(),
    queryFn: buscarEu,
    ...opcoesDeLeitura(opcoes),
  });
}

export function useEntrar() {
  return useMutation({
    mutationFn: ({ email, senha }: CorpoLogin) => entrarNaApi(email, senha),
  });
}

export function useCadastrarEmpresa() {
  return useMutation({ mutationFn: cadastrarEmpresa });
}

export function useCadastrarMotorista() {
  return useMutation({ mutationFn: cadastrarMotorista });
}
