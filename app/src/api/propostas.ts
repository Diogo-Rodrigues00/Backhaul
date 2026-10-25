// Propostas: POST /propostas, GET /cargas/:id/propostas, POST /propostas/:id/responder
// e GET /propostas/minhas. Só as chamadas (sem TanStack Query); os hooks ficam em
// `propostas.hooks.ts` (ADR 0004, adendo 2).
// PROPOSTA relatório 4a: GET /propostas/minhas ainda não existe no backend; o formato está em
// tipos.ts. Quando entrar em docs/api.md, conferir.
import { requisitar } from './cliente';
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
