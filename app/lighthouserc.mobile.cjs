// Lighthouse CI, mobile (preset padrão: 4G simulado, CPU 4x mais lenta). ADR 0011/0012/0013.
// Decisão do Pedro (adendo do ADR 0011): Performance mobile < 100 é aceita. Por isso
// ela é `warn` (a nota aparece no log e no resumo do job, mas não reprova o PR).
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
        disableStorageReset: true,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 1 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/mobile',
    },
  },
};
