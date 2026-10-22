// Lista única de rotas web: axe, Playwright e Lighthouse leem daqui (ADR 0012).
// Toda rota nova entra aqui no próprio card.
// `naoEncontrada: true` marca a rota que deve cair na página 404 (não tem .html próprio em dist/).
export const rotas = [
  { caminho: '/', perfil: null },
  { caminho: '/cadastro', perfil: null },
  { caminho: '/cadastro/empresa', perfil: null },
  { caminho: '/entrar', perfil: null },
  { caminho: '/cadastro/motorista', perfil: null },
  // Rotas logadas: o teste grava o token de mock do perfil antes de abrir (e2e/fixtures.ts).
  { caminho: '/admin', perfil: 'admin' as const },
  { caminho: '/empresa/cargas', perfil: 'empresa' as const },
  { caminho: '/motorista/cargas', perfil: 'motorista' as const },
  { caminho: '/nao-existe', perfil: null, naoEncontrada: true },
];
