// Propostas: POST /propostas, GET /cargas/:id/propostas, POST /propostas/:id/responder
// e GET /propostas/minhas.
// PROPOSTA relatório 4a: GET /propostas/minhas ainda não existe no backend; o formato está em
// tipos.ts. Quando entrar em docs/api.md, conferir.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type {
  AcaoResposta,
  CorpoFazerProposta,
  RespostaFazerProposta,
  RespostaMinhasPropostas,
  RespostaPropostasDaCarga,
  RespostaResponder,
} from './tipos';

export function fazerProposta(dados: CorpoFazerProposta): Promise<RespostaFazerProposta> {
  return requisitar<RespostaFazerProposta>('POST', '/propostas', { corpo: dados });
}

export function listarPropostasDaCarga(cargaId: string): Promise<RespostaPropostasDaCarga> {
  return requisitar<RespostaPropostasDaCarga>(
    'GET',
    `/cargas/${encodeURIComponent(cargaId)}/propostas`,
  );
}

export function responderProposta(
  propostaId: string,
  acao: AcaoResposta,
): Promise<RespostaResponder> {
  return requisitar<RespostaResponder>(
    'POST',
    `/propostas/${encodeURIComponent(propostaId)}/responder`,
    { corpo: { acao } },
  );
}

export function listarMinhasPropostas(): Promise<RespostaMinhasPropostas> {
  return requisitar<RespostaMinhasPropostas>('GET', '/propostas/minhas');
}

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
