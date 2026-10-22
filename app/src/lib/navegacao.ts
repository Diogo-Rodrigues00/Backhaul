// Qual item da navegação é a página aberta (aria-current="page"). Funções puras.

/** O que um `href` do expo-router pode ser: texto ("/empresa/cargas") ou { pathname, params }. */
export type HrefSimples = string | { pathname: string };

/** Só o caminho: sem query (`?id=1`) nem âncora (`#conteudo`). */
export function caminhoDoHref(href: HrefSimples): string {
  const bruto = typeof href === 'string' ? href : href.pathname;
  return bruto.split(/[?#]/)[0] ?? '';
}

function semBarraFinal(caminho: string): string {
  return caminho.length > 1 && caminho.endsWith('/') ? caminho.slice(0, -1) : caminho;
}

/**
 * `true` quando `pathname` é o destino ou está dentro dele: "/empresa/cargas/detalhe" marca
 * "Minhas cargas" (/empresa/cargas). A raiz "/" só marca a si mesma.
 */
export function ehPaginaAtual(pathname: string, href: HrefSimples): boolean {
  const atual = semBarraFinal(pathname);
  const destino = semBarraFinal(caminhoDoHref(href));
  if (destino === '/') return atual === '/';
  return atual === destino || atual.startsWith(`${destino}/`);
}

/**
 * Índice do item que marca a página aberta, ou -1. Quando mais de um destino contém a página
 * ("/empresa/cargas/nova" está dentro de "/empresa/cargas" e é "Publicar carga"), vence o mais
 * específico: o de caminho mais longo. Assim só um item da navegação leva `aria-current`.
 */
export function indiceDaPaginaAtual(pathname: string, hrefs: readonly HrefSimples[]): number {
  let melhor = -1;
  let tamanhoMelhor = -1;
  hrefs.forEach((href, indice) => {
    if (!ehPaginaAtual(pathname, href)) return;
    const tamanho = semBarraFinal(caminhoDoHref(href)).length;
    if (tamanho > tamanhoMelhor) {
      melhor = indice;
      tamanhoMelhor = tamanho;
    }
  });
  return melhor;
}
