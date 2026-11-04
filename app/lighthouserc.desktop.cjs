// Lighthouse CI, desktop. ADR 0011/0012/0013.
// Decisão do Pedro (2026-11-04, Fase 6.0): Performance de desktop oscila no CI (0,88–1,00)
// e já reprovou PR sem relação com a mudança. Por isso ela é `warn`, como no mobile (a nota
// aparece no log e no resumo do job, mas não reprova o PR).
// Acessibilidade, Boas práticas e SEO continuam exigindo 100.
const { urls } = require('./scripts/lhci-rotas.cjs');

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 3,
      startServerCommand: 'node scripts/servidores-ci.mjs',
      startServerReadyPattern: 'pronto',
      startServerReadyTimeout: 60000,
      puppeteerScript: './scripts/lhci-login.cjs',
      // Com puppeteerScript, as flags do Chrome vão aqui (settings.chromeFlags é ignorado).
      puppeteerLaunchOptions: { args: ['--no-sandbox'] },
      settings: {
        preset: 'desktop',
        disableStorageReset: true,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 1, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 1, aggregationMethod: 'median' }],
        'categories:best-practices': ['error', { minScore: 1, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: 1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/desktop',
    },
  },
};
