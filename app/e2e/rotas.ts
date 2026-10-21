// Lista única de rotas web: axe, Playwright e Lighthouse leem daqui (ADR 0012).
// Toda rota nova entra aqui no próprio card.
// `naoEncontrada: true` marca a rota que deve cair na página 404 (não tem .html próprio em dist/).
export const rotas = [
  { caminho: '/', perfil: null },
  { caminho: '/nao-existe', perfil: null, naoEncontrada: true },
];
