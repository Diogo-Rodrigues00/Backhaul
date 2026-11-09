// Botão que abre e fecha a conversa de uma proposta (card 042, ADR 0016). É um disclosure: o
// `aria-expanded` diz se a conversa está aberta e o `aria-controls` aponta o painel. O nome acessível
// leva o nome da outra parte ("Abrir conversa com João da Silva"), único entre os botões da lista. O
// texto visível ("Abrir conversa") está contido no nome acessível (WCAG 2.5.3). Usado pelo cartão
// de proposta da empresa (042) e pelo do motorista (043).
import { Botao } from '@/components/atoms/Botao';

export const ROTULO_ABRIR_CONVERSA = 'Abrir conversa';
export const ROTULO_FECHAR_CONVERSA = 'Fechar conversa';

export interface PropsBotaoConversa {
  /** A conversa desta proposta está aberta. */
  aberta: boolean;
  /** Nome de quem está do outro lado (motorista ou empresa): entra no nome acessível. */
  nome: string;
  /** `id` do painel da conversa (alvo do `aria-controls`). */
  idDoPainel: string;
  aoAlternar: () => void;
}

export function BotaoConversa({ aberta, nome, idDoPainel, aoAlternar }: PropsBotaoConversa) {
  const rotulo = aberta ? ROTULO_FECHAR_CONVERSA : ROTULO_ABRIR_CONVERSA;
  return (
    <Botao
      variante="secundario"
      icone="message-square"
      bloco
      aria-expanded={aberta}
      aria-controls={idDoPainel}
      aria-label={`${rotulo} com ${nome}`}
      aoPressionar={aoAlternar}
    >
      {rotulo}
    </Botao>
  );
}
