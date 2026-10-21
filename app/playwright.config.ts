import { defineConfig, devices } from '@playwright/test';

// E2E web (ADR 0012): roda no `dist/` de produção. Antes: `npm run export:ci`.
const porta = 4173;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${porta}`,
    locale: 'pt-BR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/servir-dist.mjs ${porta}`,
    port: porta,
    reuseExistingServer: true,
  },
});
