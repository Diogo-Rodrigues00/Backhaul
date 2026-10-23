// Parte da página inicial que roda no navegador. Fica separada de `sessaoNaInicial.ts` (strings do
// `<head>`, só usadas no build) para essas strings não entrarem no JS da rota.

/** Marca posta no <html> pelo script do `<head>` (ver `sessaoNaInicial.ts`). */
export const ATRIBUTO_SESSAO_INICIAL = 'data-sessao-inicial';

/** A sessão foi conferida e não há o que redirecionar: mostra a apresentação. */
export function liberarPaginaInicial(): void {
  if (typeof document === 'undefined') return;
  document.documentElement?.removeAttribute?.(ATRIBUTO_SESSAO_INICIAL);
}
