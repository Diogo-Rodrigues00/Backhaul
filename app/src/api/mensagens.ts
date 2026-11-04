// Chat da proposta: GET e POST /propostas/:id/mensagens. Só as chamadas (sem TanStack Query); os hooks
// ficam em `mensagens.hooks.ts` (ADR 0004, adendo). Em arquivo próprio para não mexer em `propostas.ts`.
import { requisitar } from './cliente';
import type { CorpoEnviarMensagem, RespostaEnviarMensagem, RespostaMensagens } from './tipos';

/** Histórico em ordem cronológica. Vale para qualquer status da proposta, inclusive encerrada. */
export function listarMensagens(propostaId: string): Promise<RespostaMensagens> {
  return requisitar<RespostaMensagens>(
    'GET',
    `/propostas/${encodeURIComponent(propostaId)}/mensagens`,
  );
}

/** O remetente é sempre o usuário do token: não vai no corpo. */
export function enviarMensagem(propostaId: string, texto: string): Promise<RespostaEnviarMensagem> {
  const corpo: CorpoEnviarMensagem = { texto };
  return requisitar<RespostaEnviarMensagem>(
    'POST',
    `/propostas/${encodeURIComponent(propostaId)}/mensagens`,
    { corpo },
  );
}
