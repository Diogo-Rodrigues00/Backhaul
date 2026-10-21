import { useEffect, useRef } from 'react';

import { Botao } from '@/components/atoms/Botao';
import { anunciar } from '@/lib/a11y';

export interface PropsBotaoAtualizar {
  /** Refaz a leitura (`refetch()`). */
  aoAtualizar: () => void | Promise<unknown>;
  /** Buscando agora (`isFetching`): mostra "Atualizando…" e ignora toques. */
  atualizando: boolean;
}

export const ANUNCIO_LISTA_ATUALIZADA = 'Lista atualizada';

/**
 * Botão "Atualizar" (ADR 0010). Enquanto busca vira "Atualizando…" (`aria-busy`, 1 toque = 1
 * requisição). Quando a busca termina anuncia "Lista atualizada" na região viva, sem mover o foco.
 */
export function BotaoAtualizar({ aoAtualizar, atualizando }: PropsBotaoAtualizar) {
  // Só anuncia na passada de "atualizando" para "parado", nunca na montagem.
  const estavaAtualizando = useRef(atualizando);

  useEffect(() => {
    if (estavaAtualizando.current && !atualizando) anunciar(ANUNCIO_LISTA_ATUALIZADA);
    estavaAtualizando.current = atualizando;
  }, [atualizando]);

  return (
    <Botao
      variante="secundario"
      icone="refresh"
      carregando={atualizando}
      rotuloCarregando="Atualizando…"
      aoPressionar={aoAtualizar}
    >
      Atualizar
    </Botao>
  );
}
