import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Página inicial pública (`/`): marca, frase do produto e as portas "Entrar" e "Criar conta".
// O axe nos dois temas e em 320 px já cobre `/` pela lista de e2e/rotas.ts.
const H1 = 'A urgência decide quem sai na frente';

test.describe('visitante', () => {
  test('mostra um h1, a frase do produto e os dois botões grandes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('A urgência decide').first()).toBeAttached();

    for (const nome of ['Entrar', 'Criar conta']) {
      const botao = page.getByRole('main').getByRole('link', { name: nome });
      await expect(botao).toBeVisible();
      const caixa = await botao.boundingBox();
      expect(caixa!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('"Entrar" abre /entrar e "Criar conta" abre /cadastro', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();

    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test('o teclado alcança os dois botões e o foco aparece', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    const entrar = page.getByRole('main').getByRole('link', { name: 'Entrar' });
    await entrar.focus();
    await expect(entrar).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('main').getByRole('link', { name: 'Criar conta' })).toBeFocused();
  });
});

// Amostra a cada quadro se o h1 da home está visível (existe e `visibility` não é hidden). Guarda em
// `window.__viuAHome` e em `__viuAHomeEm` (ms desde o início) o primeiro quadro em que ela apareceu.
async function vigiarAHome(page: Page): Promise<void> {
  await page.addInitScript((titulo) => {
    const w = window as unknown as { __viuAHome?: boolean };
    w.__viuAHome = false;
    const olhar = () => {
      const h1 = [...document.querySelectorAll('h1')].find((el) => el.textContent === titulo);
      if (h1 && getComputedStyle(h1).visibility !== 'hidden') w.__viuAHome = true;
      requestAnimationFrame(olhar);
    };
    requestAnimationFrame(olhar);
  }, H1);
}
const viuAHome = (page: Page) =>
  page.evaluate(() => (window as unknown as { __viuAHome: boolean }).__viuAHome);

test.describe('quem já tem sessão', () => {
  test('nunca vê a apresentação: vai direto à sua área', async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await vigiarAHome(page);
    // Segura a restauração da sessão: o HTML estático da `/` já está na tela, mas escondido.
    await page.route('**/eu', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 1500));
      await rota.continue();
    });
    await page.goto('/');
    await page.waitForTimeout(800);
    expect(await viuAHome(page)).toBe(false);

    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cargas próximas' })).toBeVisible();
    expect(await viuAHome(page)).toBe(false);
  });

  test('token inválido (401): a home não aparece e o app abre /entrar com o aviso', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'motorista');
    await vigiarAHome(page);
    await page.route('**/eu', (rota) =>
      rota.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ erro: 'token inválido' }),
      }),
    );
    await page.goto('/');

    await expect(page).toHaveURL(/\/entrar\?aviso=sessao-expirada$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
    expect(await viuAHome(page)).toBe(false);
  });

  test('servidor com erro 5xx na sessão: a home reaparece e o token continua guardado', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.route('**/eu', (rota) =>
      rota.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ erro: 'erro interno' }),
      }),
    );
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('backhaul.token'))).toBe(
      'mock-motorista',
    );
  });

  test('JavaScript falhando: a home volta sozinha depois de 7 s (rede de segurança em CSS)', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.route('**/_expo/static/js/**', (rota) => rota.abort());
    await page.goto('/');

    const h1 = page.getByRole('heading', { level: 1, name: H1 });
    await expect(h1).toBeHidden();
    await expect(h1).toBeVisible({ timeout: 12_000 });
  });
});
