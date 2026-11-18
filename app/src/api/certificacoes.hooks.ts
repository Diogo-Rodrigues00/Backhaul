// Hooks de certificações (TanStack Query). As chamadas ficam em `certificacoes.ts`.
import { useMutation, useQuery, useQueryClient } from './tanstack';

import {
  enviarCertificacao,
  listarCertificacoes,
  listarCertificacoesPendentes,
  listarMinhasCertificacoes,
  responderCertificacaoPendente,
} from './certificacoes';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import type { AcaoCertificacao } from './tipos';

export function useCertificacoes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.certificacoes.catalogo(),
    queryFn: listarCertificacoes,
    // A lista quase não muda: não precisa ser buscada de novo a cada tela.
    staleTime: 10 * 60_000,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Certificações do motorista logado, com a situação de cada uma. */
export function useMinhasCertificacoes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.certificacoes.minhas(),
    queryFn: listarMinhasCertificacoes,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Cadastra e reenvia. Invalida: certificacoes.minhas. */
export function useEnviarCertificacao() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: enviarCertificacao,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.certificacoes.minhas() }),
  });
}

/** Fila do admin (mais antigas primeiro). Só nome, certificação, número, validade e placa. */
export function useCertificacoesPendentes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.certificacoes.pendentes(),
    queryFn: listarCertificacoesPendentes,
    ...opcoesDeLeitura(opcoes),
  });
}

/**
 * Aprova ou recusa. Invalida a fila e o resumo do admin (a contagem de pendentes muda).
 * Também roda em erro: um 404 quer dizer que outro admin já decidiu, e a fila precisa ser buscada de novo.
 */
export function useResponderCertificacao() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ certificacaoId, acao }: { certificacaoId: string; acao: AcaoCertificacao }) =>
      responderCertificacaoPendente(certificacaoId, acao),
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.certificacoes.pendentes() }),
        cliente.invalidateQueries({ queryKey: chaves.admin.resumo() }),
      ]),
  });
}
