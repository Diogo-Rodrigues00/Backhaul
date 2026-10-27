// Lighthouse CI, desktop. As quatro categorias exigem 100 (ADR 0011/0012/0013).
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
        'categories:performance': ['error', { minScore: 1, aggregationMethod: 'median' }],
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
