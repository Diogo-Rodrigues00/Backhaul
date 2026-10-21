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
