// Hooks de propostas (TanStack Query). As chamadas ficam em `propostas.ts`.
import { useMutation, useQuery, useQueryClient } from './tanstack';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import {
  fazerProposta,
  listarMinhasPropostas,
  listarPropostasDaCarga,
  responderProposta,
} from './propostas';
import type { AcaoResposta } from './tipos';

/** Invalida: propostas.minhas e cargas.proximas (a carga some da lista ao receber proposta). */
export function useFazerProposta() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fazerProposta,
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.propostas.minhas() }),
        cliente.invalidateQueries({ queryKey: chaves.cargas.proximas() }),
      ]),
  });
}

export function usePropostasDaCarga(cargaId: string, opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.propostas.daCarga(cargaId),
    queryFn: () => listarPropostasDaCarga(cargaId),
    ...opcoesDeLeitura(opcoes),
  });
}

/**
 * `cargaId` é a carga das propostas que a tela está mostrando (a rota responde por proposta,
 * mas o que precisa atualizar é a lista da carga). Invalida: propostas.daCarga(cargaId),
 * cargas.minhas e fretes.meus (aceitar cria frete).
 */
export function useResponderProposta(cargaId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ propostaId, acao }: { propostaId: string; acao: AcaoResposta }) =>
      responderProposta(propostaId, acao),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.propostas.daCarga(cargaId) }),
        cliente.invalidateQueries({ queryKey: chaves.cargas.minhas() }),
        cliente.invalidateQueries({ queryKey: chaves.fretes.meus() }),
      ]),
  });
}

export function useMinhasPropostas(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.propostas.minhas(),
    queryFn: listarMinhasPropostas,
    ...opcoesDeLeitura(opcoes),
  });
}
