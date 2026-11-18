// Hooks do chat da proposta (TanStack Query). As chamadas ficam em `mensagens.ts`.
import { useMutation, useQuery, useQueryClient } from './tanstack';

import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';
import { enviarMensagem, listarMensagens } from './mensagens';

/** Histórico do chat, em ordem cronológica. Atualização automática só com `opcoes.automatico` (ADR 0010). */
export function useMensagens(propostaId: string, opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.mensagens.daProposta(propostaId),
    queryFn: () => listarMensagens(propostaId),
    ...opcoesDeLeitura(opcoes),
  });
}

/** Invalida: mensagens.daProposta(propostaId). Mensagem recusada (400 ou 409) não invalida nada. */
export function useEnviarMensagem(propostaId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) => enviarMensagem(propostaId, texto),
    onSuccess: () =>
      cliente.invalidateQueries({ queryKey: chaves.mensagens.daProposta(propostaId) }),
  });
}
