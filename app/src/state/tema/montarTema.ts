import { Platform, type ViewStyle } from 'react-native';

import { border, colors, motion, radius, shadow, space, touch, type } from '@/theme/tokens';
import { coresWeb, type Papeis } from '@/theme/variaveis';

export type Esquema = 'light' | 'dark';

export interface TemaVisual {
  /** Web: `var(--papel)` (constante). iPhone: hex do esquema efetivo. */
  colors: Papeis;
  /** Web: `boxShadow` com variável CSS. iPhone: propriedades de sombra do esquema. */
  sombra: { card: ViewStyle; dialog: ViewStyle };
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  touch: typeof touch;
  border: typeof border;
  motion: typeof motion;
}

const compartilhado = { space, radius, type, touch, border, motion } as const;

const sombraWeb: TemaVisual['sombra'] = {
  card: { boxShadow: 'var(--shadow-card)' },
  dialog: { boxShadow: 'var(--shadow-dialog)' },
};

// Um objeto por esquema (e um só na web): quem memoiza por tema recalcula só quando ele muda.
const cache = new Map<string, TemaVisual>();

/** Tokens prontos para a plataforma atual. Na web o esquema não importa: o CSS resolve o tema. */
export function montarTema(esquema: Esquema): TemaVisual {
  const web = Platform.OS === 'web';
  const chave = web ? 'web' : esquema;
  const existente = cache.get(chave);
  if (existente) return existente;
  const novo: TemaVisual = web
    ? { colors: coresWeb, sombra: sombraWeb, ...compartilhado }
    : {
        colors: colors[esquema],
        sombra: shadow[esquema] as TemaVisual['sombra'],
        ...compartilhado,
      };
  cache.set(chave, novo);
  return novo;
}
