// Painel da conversa de uma proposta (card 042, ADR 0016): junta o hook de tela e o organismo. É o que
// "Propostas da carga" (empresa, card 042) e "Minhas propostas" (motorista, card 043) abrem sob
// demanda: o código do chat só chega no primeiro "Abrir conversa" (`PainelDaConversa.carregar.ts`).
import { ConversaDaProposta } from '@/components/organisms/ConversaDaProposta';

import { useConversaDaProposta, type EntradaConversaDaProposta } from './useConversaDaProposta';

export interface PropsPainelDaConversa extends EntradaConversaDaProposta {
  /** `id` do painel, o mesmo do `aria-controls` do botão que abre a conversa. */
  id: string;
}

export default function PainelDaConversa({ id, ...entrada }: PropsPainelDaConversa) {
  return <ConversaDaProposta id={id} {...useConversaDaProposta(entrada)} />;
}
