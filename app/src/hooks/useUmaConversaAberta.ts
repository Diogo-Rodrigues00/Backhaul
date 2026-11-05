// Uma conversa aberta por tela (card 042, ADR 0016). Abrir a conversa de outra proposta fecha a
// anterior, então há no máximo uma consulta de mensagens com atualização automática além da lista.
// A tela guarda só o `id` da proposta e, para cada cartão, passa `aberta`, `idDoPainel` e `alternar`
// ao `BotaoConversa` e monta o painel (`ConversaSobDemanda`) só no cartão aberto.
import { useCallback, useState } from 'react';

/** `id` do painel da conversa de uma proposta: alvo do `aria-controls` do `BotaoConversa`. */
export function idDoPainelDaConversa(propostaId: string): string {
  return `conversa-${propostaId}`;
}

export function useUmaConversaAberta() {
  const [aberta, setAberta] = useState<string | null>(null);

  /** Abre a conversa da proposta (fechando a que estava aberta) ou fecha se ela já estava aberta. */
  const alternar = useCallback(
    (propostaId: string) => setAberta((atual) => (atual === propostaId ? null : propostaId)),
    [],
  );

  return { aberta, estaAberta: (propostaId: string) => aberta === propostaId, alternar };
}
