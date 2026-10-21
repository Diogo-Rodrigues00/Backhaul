import { colors } from './tokens';

type Folha = string;
interface Arvore {
  readonly [chave: string]: Folha | Arvore;
}

/** `onInverse` vira `on-inverse` (camelCase para kebab-case). */
function paraKebab(chave: string): string {
  return chave.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Nome da variável CSS de um papel: `['urgency', 'critico', 'bg']` vira `--urgency-critico-bg`. */
export function nomeVariavel(caminho: readonly string[]): string {
  return `--${caminho.map(paraKebab).join('-')}`;
}

/** Achata a árvore de cores em pares `[nome da variável, valor]`. */
export function achatar(arvore: Arvore, prefixo: readonly string[] = []): [string, string][] {
  const pares: [string, string][] = [];
  for (const [chave, valor] of Object.entries(arvore)) {
    const caminho = [...prefixo, chave];
    if (typeof valor === 'string') {
      pares.push([nomeVariavel(caminho), valor]);
    } else {
      pares.push(...achatar(valor, caminho));
    }
  }
  return pares;
}

/** Forma de `colors.light` com cada hex alargado para `string` (serve aos dois temas e a `var(...)`). */
export type Papeis<T = (typeof colors)['light']> = {
  readonly [K in keyof T]: T[K] extends string ? string : Papeis<T[K]>;
};

function comoVariaveis(arvore: Arvore, prefixo: readonly string[] = []): Arvore {
  const saida: Record<string, Folha | Arvore> = {};
  for (const [chave, valor] of Object.entries(arvore)) {
    const caminho = [...prefixo, chave];
    saida[chave] =
      typeof valor === 'string' ? `var(${nomeVariavel(caminho)})` : comoVariaveis(valor, caminho);
  }
  return saida;
}

/**
 * Mesma forma de `colors.light`, mas cada folha é `var(--papel)`. É o que `useTema().colors`
 * devolve na web: o react-native-web repassa a string ao CSS e o navegador resolve o tema.
 */
export const coresWeb = comoVariaveis(colors.light) as unknown as Papeis;
