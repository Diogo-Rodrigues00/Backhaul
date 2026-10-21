import { expect, test } from '@playwright/test';

// Roda contra o build de produção (`npm run export:ci` + servidor estático). O service worker
// só é registrado em produção e sem EXPO_PUBLIC_API_MOCK (ADR 0014).

test('manifesto válido, com os campos obrigatórios do PWA instalável', async ({ request }) => {
  const resposta = await request.get('/manifest.webmanifest');
  expect(resposta.ok()).toBe(true);
  const m = await resposta.json();

  expect(m.name).toBe('Backhaul');
  expect(m.short_name).toBe('Backhaul');
  expect(m.lang).toBe('pt-BR');
  expect(m.start_url).toBe('/');
  expect(m.scope).toBe('/');
  expect(m.display).toBe('standalone');
  expect(m.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(m.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);

  const tamanhos = m.icons.map(
    (i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`,
  );
  expect(tamanhos).toEqual(
    expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']),
  );
  for (const icone of m.icons) {
    expect((await request.get(icone.src)).ok(), icone.src).toBe(true);
  }
});

test('a página liga manifesto, ícone da Apple e theme-color', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icones/apple-touch-icon-180.png',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
});

test('sw.js fica registrado e ativo na rota /', async ({ page }) => {
  await page.goto('/');
  const escopo = await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready;
    return registro.scope;
  });
  expect(escopo).toMatch(/\/$/);
  const ativo = await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready;
    return registro.active?.scriptURL ?? null;
  });
  expect(ativo).toMatch(/\/sw\.js$/);
});
