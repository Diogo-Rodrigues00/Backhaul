import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Card 014: portão do servidor (cold start). A API é o mock em localhost:4010; o atraso e a falha de
// GET /saude são simulados na rede do navegador (ADR 0005, D-PO-15).
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const h1 = (page: Page, nome: string) => page.getByRole('heading', { level: 1, name: nome });
const CONECTANDO = 'Conectando ao servidor';
const FALHOU = 'Não foi possível conectar ao servidor';

test.describe('servidor acordando', () => {
  test('/saude lenta (2 s): mostra "Conectando ao servidor" e libera sozinha', async ({ page }) => {
    await page.route('**/saude', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 2000));
      await rota.continue();
    });
    await page.goto('/');

    await expect(h1(page, CONECTANDO)).toBeVisible();
    await expect(page.getByText('O servidor pode levar até 1 minuto para acordar.')).toBeVisible();
    await expect(page.getByText('Tentativa 1 de 18')).toBeVisible();
    // A região viva global está sempre no DOM; a da tela é a do banner.
    await expect(page.getByRole('alert')).toHaveCount(0);

    await expect(h1(page, 'A urgência decide quem sai na frente')).toBeVisible();
    await expect(h1(page, CONECTANDO)).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('servidor rápido: a tela nunca aparece', async ({ page }) => {
    await page.goto('/');
    await expect(h1(page, 'A urgência decide quem sai na frente')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(h1(page, CONECTANDO)).toHaveCount(0);
  });

  test('com sessão, espera o servidor acordar e abre a área do perfil (não o login)', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('backhaul.token', 'mock-empresa'));
    await page.route('**/saude', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 1500));
      await rota.continue();
    });
    await page.goto('/empresa/cargas');

    await expect(h1(page, CONECTANDO)).toBeVisible();
    await expect(h1(page, 'Minhas cargas')).toBeVisible();
    await expect(page).toHaveURL(/\/empresa\/cargas$/);
    expect(await page.evaluate(() => localStorage.getItem('backhaul.token'))).toBe('mock-empresa');
  });

  test('foco vai ao título e o indicador para com movimento reduzido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/saude', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 2500));
      await rota.continue();
    });
    await page.goto('/');
    await expect(h1(page, CONECTANDO)).toBeFocused();

    const estrada = page.locator('main [aria-hidden="true"]').first();
    const faixa = () =>
      estrada.evaluate((el) => (el.firstElementChild as HTMLElement | null)?.style.transform ?? '');
    const antes = await faixa();
    await page.waitForTimeout(400);
    expect(await faixa()).toBe(antes);
  });

  test('a estrada anda quando o movimento não está reduzido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('**/saude', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 2500));
      await rota.continue();
    });
    await page.goto('/');
    await expect(h1(page, CONECTANDO)).toBeVisible();

    const estrada = page.locator('main [aria-hidden="true"]').first();
    const faixa = () =>
      estrada.evaluate((el) => (el.firstElementChild as HTMLElement | null)?.style.transform ?? '');
    const antes = await faixa();
    await expect.poll(faixa).not.toBe(antes);
  });

  test('axe sem violações na tela "Conectando ao servidor"', async ({ page }) => {
    await page.route('**/saude', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 3000));
      await rota.continue();
    });
    await page.goto('/');
    await expect(h1(page, CONECTANDO)).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('servidor que não responde', () => {
  async function ate90Segundos(page: Page) {
    // Tempo falso: 18 tentativas de 5 s sem esperar 90 s de verdade. A rede continua real, então cada
    // volta dá um respiro para a resposta 503 chegar antes do próximo passo.
    await page.clock.install();
    await page.route('**/saude', (rota) =>
      rota.fulfill({ status: 503, json: { erro: 'indisponível' } }),
    );
    await page.goto('/');
    for (let volta = 0; volta < 19; volta += 1) {
      await page.waitForTimeout(80);
      await page.clock.runFor(5000);
    }
  }

  test('90 s sem 200: mostra a falha com alerta e "Tentar de novo" recomeça', async ({ page }) => {
    await ate90Segundos(page);

    await expect(h1(page, FALHOU)).toBeVisible();
    await expect(h1(page, FALHOU)).toBeFocused();
    await expect(page.getByRole('alert')).toContainText('o servidor não respondeu');

    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    // O servidor "volta": o botão reinicia o ciclo e o app abre sozinho.
    await page.unroute('**/saude');
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(h1(page, 'A urgência decide quem sai na frente')).toBeVisible();
    await expect(h1(page, FALHOU)).toHaveCount(0);
  });
});
