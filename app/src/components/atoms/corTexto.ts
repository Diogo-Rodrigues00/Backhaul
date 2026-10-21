import type { Papeis } from '@/theme/variaveis';

/** Papéis de cor de texto do DS (seção 3.1). Padrão do `Texto`: `primario`. */
export const CORES_TEXTO = [
  'primario',
  'secundario',
  'discreto',
  'destaque',
  'link',
  'sobreInverso',
  'sobreInversoDiscreto',
  'sobreAcao',
  'erro',
  'sucesso',
  'info',
  'desabilitado',
] as const;

export type CorTexto = (typeof CORES_TEXTO)[number];

/**
 * Valor da cor de um papel no tema atual: hex no iPhone, `var(--papel)` na web.
 * Serve para quem precisa da cor fora de um `Texto` (ex.: traço de um ícone).
 */
export function corDoTexto(colors: Papeis, cor: CorTexto): string {
  switch (cor) {
    case 'primario':
      return colors.text.primary;
    case 'secundario':
      return colors.text.secondary;
    case 'discreto':
      return colors.text.muted;
    case 'destaque':
      return colors.text.accent;
    case 'link':
      return colors.text.link;
    case 'sobreInverso':
      return colors.text.onInverse;
    case 'sobreInversoDiscreto':
      return colors.text.onInverseMuted;
    case 'sobreAcao':
      return colors.action.onFill;
    case 'erro':
      return colors.error.text;
    case 'sucesso':
      return colors.success.text;
    case 'info':
      return colors.info.text;
    case 'desabilitado':
      return colors.disabled.text;
  }
}
