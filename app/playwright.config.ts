import { defineConfig, devices } from '@playwright/test';

// E2E web e axe (ADR 0012) contra o dist/ de produção + mock da API, sem backend real.
// Pré-requisito: `npm run export:ci` (com EXPO_PUBLIC_API_URL=http://localhost:4010).
const emCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: emCI,
  retries: 0,
  reporter: emCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/servidores-ci.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !emCI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'estreito',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } },
    },
  ],
});
