import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// Card 016 (MVP-05): cadastro de empresa contra o mock da API (localhost:4010).
// O mock de login só conhece as contas de demonstração, então o caminho feliz intercepta só
// POST /login (a conta nova não existe no login do mock); o cadastro em si vai ao mock de verdade.
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('cadastro de empresa', () => {
  test('caminho feliz: escolhe empresa, cria a conta e entra em Minhas cargas', async ({
    page,
  }) => {
    await page.route('**/login', (rota) =>
      rota.fulfill({ json: { token: 'mock-empresa', tipo: 'empresa' } }),
    );

    await page.goto('/cadastro');
    await expect(h1(page)).toHaveText('Criar conta');
    await page.getByRole('link', { name: 'Sou empresa' }).click();
    await expect(h1(page)).toHaveText('Cadastro de empresa');

    await page.getByLabel('E-mail').fill('nova@empresa.test');
    await page.getByLabel('Senha', { exact: true }).fill('senhaSegura8');
    await page.getByLabel('Razão social').fill('Transportes Rápidos LTDA');
    await page.getByLabel('CNPJ').fill('12.345.678/0001-99');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/empresa\/cargas$/);
    await expect(h1(page)).toHaveText('Minhas cargas');
  });

  test('409 do mock: a mensagem aparece no resumo e a senha é limpa', async ({ page }) => {
    await page.goto('/cadastro/empresa');
    await page.getByLabel('E-mail').fill('existente@mock.test');
    await page.getByLabel('Senha', { exact: true }).fill('senhaSegura8');
    await page.getByLabel('Razão social').fill('Transportes Rápidos LTDA');
    await page.getByLabel('CNPJ').fill('12.345.678/0001-99');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByRole('alert')).toContainText('email já cadastrado');
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('E-mail')).toHaveValue('existente@mock.test');
  });

  test('320 px (ou 1280 px): sem rolagem horizontal', async ({ page }) => {
    await page.goto('/cadastro/empresa');
    await expect(h1(page)).toBeVisible();
    const { largura, janela } = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      janela: window.innerWidth,
    }));
    expect(largura).toBeLessThanOrEqual(janela);
  });
});
