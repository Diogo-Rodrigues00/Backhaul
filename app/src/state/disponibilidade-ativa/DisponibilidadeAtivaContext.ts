import { createContext } from 'react';

import type { Disponibilidade } from '@/lib/disponibilidadeAtiva';

/**
 * De onde vem a lista: `api` é `GET /disponibilidades/minhas` (proposta 4b); `local` é o plano B,
 * em que a rota ainda não existe (404) e a única entrada é a disponibilidade publicada neste aparelho.
 */
export type OrigemDisponibilidades = 'api' | 'local';

export interface ValorDisponibilidadeAtiva {
  /**
   * A disponibilidade em uso por "Cargas próximas" e pela proposta (D-PO-03): a escolhida, se ainda
   * aberta e no prazo; senão a mais recente aberta e no prazo; senão `null`. Sempre `null` enquanto
   * `carregando`. Traz `id`, `local` (`lat`, `lng`), `raio_busca_km`, `urgencia` e `expira_em`.
   */
  ativa: Disponibilidade | null;
  /** Ainda não dá para saber a ativa: lendo o aparelho, esperando a sessão ou a primeira resposta. */
  carregando: boolean;
  /** Torna a disponibilidade a ativa e guarda a escolha no aparelho (sobrevive a recarregar/reabrir). */
  definirAtiva: (id: string) => void;
  /**
   * Para o card 023, logo depois de `POST /disponibilidades` responder 201: a recém-publicada vira a
   * ativa e, no plano B, a lista passa a mostrá-la. Guarda a cópia no aparelho.
   */
  registrarPublicada: (disponibilidade: Disponibilidade) => void;
  /** Lista da tela "Minhas disponibilidades", na ordem da fonte (a API devolve `criado_em` DESC). */
  disponibilidades: readonly Disponibilidade[];
  origem: OrigemDisponibilidades;
  /** Erro de verdade ao ler a lista (rede, 5xx, 401 tratado pela sessão); 404 não é erro (plano B). */
  erro: unknown;
  /** Lê a lista de novo (botão "Atualizar" e "Tentar de novo"). */
  atualizar: () => Promise<unknown>;
  atualizando: boolean;
}

export const DisponibilidadeAtivaContext = createContext<ValorDisponibilidadeAtiva | null>(null);
