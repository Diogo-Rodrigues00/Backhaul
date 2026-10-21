// Parte comum do ícone. Vive fora de `Icone.tsx` porque `Icone.web.tsx` e `Icone.native.tsx` não
// podem importar o arquivo base (o Metro resolveria de volta para eles mesmos).
import { type } from '@/theme/tokens';

import type { Forma, NomeIcone } from './icones';

/** `padrao` = 1,25 em (≈ 21 px); `destaque` = 1,75 em (DS seção 4). Número = px exatos. */
export type TamanhoIcone = 'padrao' | 'destaque' | number;

export interface PropsIcone {
  nome: NomeIcone;
  tamanho?: TamanhoIcone;
  /**
   * Cor do traço. Sem ela, herda a do texto ao redor na web e usa `text.primary` no iPhone.
   * Passe sempre que o ícone não estiver dentro de um `Texto` da mesma cor.
   */
  cor?: string;
  /**
   * Nome acessível. Sem ele o ícone é decorativo (`aria-hidden`), que é o caso de ícone ao lado de
   * texto. Ícone sozinho (sem texto) precisa de `rotulo`.
   */
  rotulo?: string;
}

/** Desenho genérico em SVG (os ícones e o símbolo da marca usam o mesmo desenhista). */
export interface PropsDesenho extends Omit<PropsIcone, 'nome'> {
  formas: readonly Forma[];
  /** Padrão: grade 24 dos ícones. O símbolo da marca usa `0 0 48 48`. */
  viewBox?: string;
  /** Espessura do traço de quem não define a sua. Padrão: 2 (DS seção 4). */
  espessura?: number;
}

/** Fatores do DS seção 4, em múltiplos do corpo (`type.base`). */
const FATOR: Record<'padrao' | 'destaque', number> = { padrao: 1.25, destaque: 1.75 };

/** Tamanho em px para o iPhone (a web usa `em`). Número vindo de quem chama não escala. */
export function tamanhoEmPx(tamanho: TamanhoIcone, escalaDaFonte = 1): number {
  if (typeof tamanho === 'number') return tamanho;
  return Math.round(type.base.size * FATOR[tamanho] * escalaDaFonte);
}

/** Tamanho em `em` para a web (cresce com o zoom e com o texto ao redor). */
export function tamanhoEmEm(tamanho: TamanhoIcone): string | number {
  return typeof tamanho === 'number' ? tamanho : `${FATOR[tamanho]}em`;
}

export const VIEWBOX_ICONE = '0 0 24 24';
export const ESPESSURA_ICONE = 2;
