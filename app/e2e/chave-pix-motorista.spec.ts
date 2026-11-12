import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 047: o motorista cadastra a chave Pix. A API é o mock em localhost:4010, com estado em memória
// por usuário (mocks/handlers/chavePix.ts). Os testes rodam em paralelo no mesmo mock, então nenhum
// assume o estado inicial (o formulário já pode vir preenchido por outro teste): cada um escolhe o tipo,
// troca o conteúdo do campo e confere o que a API devolveu.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LARGURA_ESTREITA = 320;

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const principal = (page: Page) => page.getByRole('main');

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'motorista');
  await page.goto('/motorista/chave-pix');
  await expect(h1(page)).toHaveText('Chave Pix');
  // A chave atual e o formulário chegam depois da hidratação.
  await expect(page.getByRole('button', { name: 'Salvar chave Pix' })).toBeVisible();
}

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`,
  );
}

/** E-mail de 130 caracteres sem espaço: a chave mais longa que a tela precisa quebrar. */
const EMAIL_LONGO = `${'a'.repeat(118)}@exemplo.com`;

/** Deixa o formulário vazio, não importa a chave que outro teste já gravou no mock. */
async function esvaziarFormulario(page: Page) {
  await page
    .getByLabel('Tipo da chave', { exact: true })
    .selectOption({ label: 'Escolha o tipo da chave' });
  await page.getByLabel('Chave Pix', { exact: true }).fill('');
}

async function cadastrarEmail(page: Page, email: string) {
  await page.getByLabel('Tipo da chave', { exact: true }).selectOption('email');
  await page.getByLabel('Chave Pix', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Salvar chave Pix' }).click();
  await expect(principal(page).getByText('Chave Pix salva.')).toBeVisible();
}

test.describe('chave Pix do motorista', () => {
  test('cadastro pelo teclado: tipo, chave, Enter; mostra a chave normalizada e anuncia', async ({
    page,
  }) => {
    await abrir(page);

    const tipo = page.getByLabel('Tipo da chave', { exact: true });
    await tipo.focus();
    await tipo.selectOption('cpf');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Chave Pix', { exact: true })).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('529.982.247-25');

    const envio = page.waitForRequest(
      (req) => req.method() === 'PUT' && req.url().endsWith('/motorista/chave-pix'),
    );
    await page.keyboard.press('Enter');

    expect((await envio).postDataJSON()).toEqual({
      tipo_chave_pix: 'cpf',
      chave_pix: '529.982.247-25',
    });
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'Chave Pix salva.',
    );
    await expect(principal(page).getByText('Chave Pix salva.')).toBeVisible();
    // A chave volta normalizada (só dígitos) e o formulário passa a mostrá-la.
    await expect(principal(page).getByText('52998224725').first()).toBeVisible();
    await expect(page.getByLabel('Chave Pix', { exact: true })).toHaveValue('52998224725');
  });

  test('o campo da chave pede o teclado do tipo escolhido', async ({ page }) => {
    await abrir(page);
    const chave = page.getByLabel('Chave Pix', { exact: true });
    const tipo = page.getByLabel('Tipo da chave', { exact: true });

    await tipo.selectOption('telefone');
    await expect(chave).toHaveAttribute('inputmode', 'tel');
    await tipo.selectOption('email');
    await expect(chave).toHaveAttribute('inputmode', 'email');
    await tipo.selectOption('cpf');
    await expect(chave).toHaveAttribute('inputmode', 'numeric');
  });

  test('chave inválida: a mensagem da API aparece no campo, que fica inválido e recebe o foco', async ({
    page,
  }) => {
    await abrir(page);
    await page.getByLabel('Tipo da chave', { exact: true }).selectOption('cpf');
    await page.getByLabel('Chave Pix', { exact: true }).fill('123.456.789-01');
    await page.getByRole('button', { name: 'Salvar chave Pix' }).click();

    await expect(page.getByText('chave_pix inválida para o tipo cpf').first()).toBeVisible();
    await expect(page.getByLabel('Chave Pix', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByLabel('Chave Pix', { exact: true })).toBeFocused();
  });

  test('axe sem violações com a chave salva (tema claro; 1280 e 320 px)', async ({ page }) => {
    await abrir(page);
    await cadastrarEmail(page, EMAIL_LONGO);
    expect(await violacoes(page)).toEqual([]);
  });

  test('axe sem violações com o formulário em erro (tema claro; 1280 e 320 px)', async ({
    page,
  }) => {
    await abrir(page);
    await esvaziarFormulario(page);
    await page.getByRole('button', { name: 'Salvar chave Pix' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Corrija 2 campos');
    expect(await violacoes(page)).toEqual([]);
  });

  test.describe('tema escuro', () => {
    test.use({ colorScheme: 'dark' });

    test('axe sem violações com a chave salva', async ({ page }) => {
      await abrir(page);
      await cadastrarEmail(page, EMAIL_LONGO);
      expect(await violacoes(page)).toEqual([]);
    });

    test('axe sem violações com o formulário em erro', async ({ page }) => {
      await abrir(page);
      await esvaziarFormulario(page);
      await page.getByRole('button', { name: 'Salvar chave Pix' }).click();
      await expect(page.getByRole('alert').first()).toContainText('Corrija 2 campos');
      expect(await violacoes(page)).toEqual([]);
    });
  });

  test('reflow em 320 px: chave longa sem espaços quebra e não há rolagem horizontal', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'estreito', 'só vale na largura de 320 px');
    await abrir(page);
    await cadastrarEmail(page, EMAIL_LONGO);

    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(LARGURA_ESTREITA);
  });
});
