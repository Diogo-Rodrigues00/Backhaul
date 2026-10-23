import { expect, test, type Page } from '@playwright/test';

// Card 005: tema claro/escuro, fonte e CSS global no HTML estático (ADR 0008).
// Cores esperadas = tokens: escuro bg.page #0E1216 (14,18,22); claro bg.page #EDEFF2 (237,239,242).
const ESCURO = 'rgb(14, 18, 22)';
const CLARO = 'rgb(237, 239, 242)';

// Estes testes montam o próprio contexto e mudam a largura quando precisam: rodam uma vez só,
// no projeto `desktop` do CI (o `estreito` fica para o reflow e o axe em 320 px).
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

const fundo = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('tema', () => {
  test('sistema escuro: a primeira pintura já é escura, até sem JavaScript', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ colorScheme: 'dark', javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto('/');
    expect(await fundo(page)).toBe(ESCURO);
    await contexto.close();
  });

  test('sistema escuro: depois da hidratação continua escuro e sem data-theme', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ colorScheme: 'dark' });
    const page = await contexto.newPage();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'A urgência decide quem sai na frente', level: 1 }),
    ).toBeVisible();
    expect(await fundo(page)).toBe(ESCURO);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
    await contexto.close();
  });

  test('escolha salva "light" vale mesmo com o sistema escuro', async ({ browser }) => {
    const contexto = await browser.newContext({ colorScheme: 'dark' });
    const page = await contexto.newPage();
    await page.addInitScript(() => localStorage.setItem('backhaul.tema', 'light'));
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    expect(await fundo(page)).toBe(CLARO);
    await contexto.close();
  });

  test('escolha salva "dark" vale com o sistema claro', async ({ browser }) => {
    const contexto = await browser.newContext({ colorScheme: 'light' });
    const page = await contexto.newPage();
    await page.addInitScript(() => localStorage.setItem('backhaul.tema', 'dark'));
    await page.goto('/');
    expect(await fundo(page)).toBe(ESCURO);
    await contexto.close();
  });

  test('o texto usa text.primary do tema (contraste) nos dois temas', async ({ browser }) => {
    for (const [esquema, cor] of [
      ['dark', 'rgb(241, 243, 245)'],
      ['light', 'rgb(20, 24, 29)'],
    ] as const) {
      const contexto = await browser.newContext({ colorScheme: esquema });
      const page = await contexto.newPage();
      await page.goto('/');
      const h1 = page.getByRole('heading', {
        name: 'A urgência decide quem sai na frente',
        level: 1,
      });
      expect(await h1.evaluate((el) => getComputedStyle(el).color)).toBe(cor);
      await contexto.close();
    }
  });

  test('theme-color tem uma variante por esquema', async ({ page }) => {
    await page.goto('/');
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((els) =>
        els.map((el) => [el.getAttribute('media'), el.getAttribute('content')]),
      );
    expect(metas).toEqual([
      ['(prefers-color-scheme: light)', '#14181D'],
      ['(prefers-color-scheme: dark)', '#0A0D10'],
    ]);
  });
});

test.describe('fonte e console', () => {
  test('a Barlow vem de /fontes/ e nada vai ao Google Fonts', async ({ page }) => {
    const requisicoes: string[] = [];
    page.on('request', (r) => requisicoes.push(r.url()));
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fontes = requisicoes.filter((u) => u.endsWith('.woff2'));
    expect(fontes.length).toBeGreaterThan(0);
    for (const u of fontes)
      expect(new URL(u).pathname).toMatch(/^\/fontes\/barlow-latin-(500|700)\.woff2$/);
    expect(requisicoes.filter((u) => /googleapis|gstatic/.test(u))).toEqual([]);
  });

  test('preload dos dois pesos, com crossorigin', async ({ page }) => {
    await page.goto('/');
    const links = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((els) =>
        els.map((el) => [el.getAttribute('href'), el.getAttribute('crossorigin')]),
      );
    expect(links).toEqual([
      ['/fontes/barlow-latin-500.woff2', 'anonymous'],
      ['/fontes/barlow-latin-700.woff2', 'anonymous'],
    ]);
  });

  test('sem erro nem aviso no console (sem aviso de hidratação)', async ({ browser }) => {
    for (const esquema of ['dark', 'light'] as const) {
      const contexto = await browser.newContext({ colorScheme: esquema });
      const page = await contexto.newPage();
      const mensagens: string[] = [];
      page.on('console', (m) => {
        if (['error', 'warning'].includes(m.type())) mensagens.push(`${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', (e) => mensagens.push(`pageerror: ${e.message}`));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(mensagens).toEqual([]);
      await contexto.close();
    }
  });

  test('fonte("base") na web usa rem: acompanha a fonte padrão do navegador', async ({ page }) => {
    await page.goto('/');
    const paragrafo = page.getByText('Plataforma que conecta caminhoneiros');
    expect(await paragrafo.evaluate((el) => getComputedStyle(el).fontSize)).toBe('17px');
    await page.addStyleTag({ content: 'html{font-size:32px}' });
    expect(await paragrafo.evaluate((el) => getComputedStyle(el).fontSize)).toBe('34px');
  });
});

test.describe('responsivo sem JavaScript e rolagem', () => {
  test('data-bp="so-celular" some acima de 720 px e aparece até 720 px', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'so-celular';
      el.dataset.bp = 'so-celular';
      el.textContent = 'só celular';
      document.body.append(el);
    });
    const alvo = page.locator('#so-celular');
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(alvo).toBeHidden();
    await page.setViewportSize({ width: 720, height: 700 });
    await expect(alvo).toBeVisible();
    await page.setViewportSize({ width: 721, height: 700 });
    await expect(alvo).toBeHidden();
  });

  test('tela alta rola em 320 px de largura e 100 px de altura (zoom 200%)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 100 });
    await page.goto('/');
    // Espera a hidratação: antes dela o conteúdo pode ainda não estar medido (CI é mais lento).
    await expect(
      page.getByRole('heading', { name: 'A urgência decide quem sai na frente', level: 1 }),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    const antes = await page.evaluate(() => ({
      alto: document.scrollingElement!.scrollHeight,
      janela: window.innerHeight,
      largura: document.scrollingElement!.scrollWidth,
    }));
    expect(antes.alto).toBeGreaterThan(antes.janela);
    expect(antes.largura).toBeLessThanOrEqual(320);
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
