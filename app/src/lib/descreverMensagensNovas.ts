// Anúncio das mensagens novas do chat da proposta (ADR 0016, card 042). Função pura: compara o retrato
// anterior da conversa com o atual e devolve o texto da região viva. Só conta mensagens DA OUTRA
// PARTE que chegaram desde o último retrato; as minhas nunca são anunciadas.
import type { ComId } from '@/lib/novidadesPropostas';

export interface MensagemAnunciavel extends ComId {
  /** Id do usuário que escreveu (o mesmo de `usuario.id` da sessão). */
  remetente_id: string;
}

/**
 * "1 nova mensagem de João da Silva" / "3 novas mensagens de João da Silva". Devolve `null` quando
 * não chegou nada da outra parte (inclusive quando só eu escrevi) ou quando falta um dos retratos.
 */
export function descreverMensagensNovas(
  anterior: readonly MensagemAnunciavel[] | undefined,
  atual: readonly MensagemAnunciavel[] | undefined,
  meuUsuarioId: string,
  nomeDaOutraParte: string,
): string | null {
  if (!anterior || !atual) return null;
  const conhecidas = new Set(anterior.map((mensagem) => mensagem.id));
  const total = atual.filter(
    (mensagem) => !conhecidas.has(mensagem.id) && mensagem.remetente_id !== meuUsuarioId,
  ).length;
  if (total === 0) return null;
  return total === 1
    ? `1 nova mensagem de ${nomeDaOutraParte}`
    : `${total} novas mensagens de ${nomeDaOutraParte}`;
}
