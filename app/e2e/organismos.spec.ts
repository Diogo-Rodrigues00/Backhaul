import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Card 010: casca da tela (cabeçalho, landmarks, foco, título por rota, tema) no HTML exportado.
// Cobertura única, no projeto `desktop` (o `estreito` já roda o axe e o reflow de 320 px).
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

const ROTAS = [
  { caminho: '/', arquivo: 'index.html', titulo: 'Backhaul', h1: 'Backhaul' },
  {
    caminho: '/nao-existe',
    arquivo: '+not-found.html',
    titulo: 'Página não encontrada · Backhaul',
    h1: 'Página não encontrada',
  },
];

const anel = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return { tag: el.tagName, texto: el.textContent, cor: getComputedStyle(el).outlineColor };
  });

test.describe('landmarks e título por rota', () => {
  for (const { caminho, titulo, h1 } of ROTAS) {
    test(`${caminho}: 1 h1, banner, main e nenhuma navegação (tela pública)`, async ({ page }) => {
      await page.goto(caminho);
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await expect(page).toHaveTitle(titulo);
    });
  }

  // Lê o HTML exportado em dist/ (o que a Vercel entrega), sem depender do servidor do CI.
  for (const { arquivo, titulo, h1 } of ROTAS) {
    test(`${arquivo}: h1, descrição, <title> e meta description estão no HTML estático`, () => {
      const html = readFileSync(`dist/${arquivo}`, 'utf8');
      expect(html).toMatch(new RegExp(`<h1[^>]*>${h1}</h1>`));
      expect(html.match(/<title[^>]*>[^<]*<\/title>/g)).toHaveLength(1);
      expect(html).toContain(`>${titulo}</title>`);
      expect(html.match(/<meta[^>]*name="description"[^>]*>/g)).toHaveLength(1);
      expect(html).toContain('<header');
      expect(html).toContain('<main');
    });
  }

  test('<title> e meta description são únicos por rota', () => {
    const lidos = ROTAS.map(({ arquivo }) => {
      const html = readFileSync(`dist/${arquivo}`, 'utf8');
      return {
        titulo: html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1],
        descricao: html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1],
      };
    });
    expect(new Set(lidos.map((l) => l.titulo)).size).toBe(ROTAS.length);
    expect(new Set(lidos.map((l) => l.descricao)).size).toBe(ROTAS.length);
  });
});

test.describe('teclado e foco', () => {
  test('o primeiro Tab chega a "Pular para o conteúdo", visível dentro da janela', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(pular).toBeFocused();
    const caixa = await pular.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.y).toBeGreaterThanOrEqual(0);
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
  });

  test('Enter em "Pular para o conteúdo" leva o foco ao main', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('conteudo');
  });

  test('o anel de foco no cabeçalho asfalto usa a cor ringOnInverse (#FFD54A)', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab'); // Pular
    await page.keyboard.press('Tab'); // Logo
    const logo = await anel(page);
    expect(logo.cor).toBe('rgb(255, 213, 74)');
    await page.keyboard.press('Tab'); // Alternar tema
    expect((await anel(page)).cor).toBe('rgb(255, 213, 74)');
  });

  test('recarregar não rouba o foco; navegar no cliente leva o foco ao h1', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');

    await page.getByRole('link', { name: 'Voltar para o início' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Backhaul' })).toBeFocused();
  });
});

test.describe('alternar tema', () => {
  test('cicla Sistema, Claro, Escuro, Sistema e persiste a escolha', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const botao = () => page.getByRole('button', { name: /Alternar tema/ });
    await expect(botao()).toHaveAccessibleName('Alternar tema. Atual: auto (segue o sistema)');

    const tema = () => page.evaluate(() => document.documentElement.dataset.theme ?? null);
    const salvo = () => page.evaluate(() => localStorage.getItem('backhaul.tema'));

    await botao().click();
    await expect(botao()).toHaveAccessibleName('Alternar tema. Atual: claro');
    expect(await tema()).toBe('light');
    expect(await salvo()).toBe('light');

    await botao().click();
    await expect(botao()).toHaveAccessibleName('Alternar tema. Atual: escuro');
    expect(await tema()).toBe('dark');
    expect(await salvo()).toBe('dark');

    await page.reload();
    expect(await tema()).toBe('dark');
    await expect(botao()).toHaveAccessibleName('Alternar tema. Atual: escuro');

    await botao().click();
    await expect(botao()).toHaveAccessibleName('Alternar tema. Atual: auto (segue o sistema)');
    expect(await tema()).toBeNull();
    expect(await salvo()).toBeNull();
  });
});

test.describe('responsivo sem JavaScript', () => {
  test('em 320 px o cabeçalho mostra logo e tema como ícones, sem rolagem horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    const botao = page.getByRole('button', { name: /Alternar tema/ });
    const caixa = await botao.boundingBox();
    expect(caixa!.width).toBeGreaterThanOrEqual(44);
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
    // O texto "Auto" só aparece acima de 960 px.
    await expect(botao.getByText('Auto')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(botao.getByText('Auto')).toBeVisible();
  });
});
