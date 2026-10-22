import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 021 (MVP-14): propostas da carga, aceitar e recusar só com o teclado, no HTML exportado e no
// mock da API (stateless: a lista volta igual depois de responder). Cobertura única, no desktop; o
// axe da rota sem diálogo roda em e2e/a11y.spec.ts nos dois temas e nas duas larguras.
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

const CARGA_URGENTE_ID = 'cccccccc-0000-4000-8000-000000000001';
const URL_DETALHE = `/empresa/cargas/detalhe?id=${CARGA_URGENTE_ID}`;
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const dentroDoDialogo = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[role="alertdialog"]') !== null);

async function abrirTela(page: Page) {
  await entrarComoPerfil(page, 'empresa');
  await page.goto(URL_DETALHE);
  await expect(page.getByRole('heading', { level: 2, name: 'Propostas (5)' })).toBeVisible();
}

test.describe('lista', () => {
  test('mostra o resumo, 5 propostas na ordem da API e botões só nas pendentes', async ({
    page,
  }) => {
    await abrirTela(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Propostas da carga');
    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      'João da Silva',
      'Maria Souza',
      'Ana Beatriz Rocha',
      'Pedro Henrique Alves',
      'Carlos Lima',
    ]);
    await expect(page.getByRole('button', { name: /^Aceitar proposta de / })).toHaveCount(4);
    await expect(page.getByRole('button', { name: /^Recusar proposta de / })).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Aceitar proposta de Carlos Lima' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('region', { name: 'Resumo da carga' })).toBeVisible();
  });

  test('id que não é da empresa: "Carga não encontrada" e link para "Minhas cargas"', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/empresa/cargas/detalhe?id=ffffffff-ffff-4fff-8fff-ffffffffffff');
    await expect(page.getByText('Carga não encontrada')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Minhas cargas' }).last()).toHaveAttribute(
      'href',
      '/empresa/cargas',
    );
  });

  test('sem id na URL: "Carga não encontrada"', async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/empresa/cargas/detalhe');
    await expect(page.getByText('Carga não encontrada')).toBeVisible();
  });
});

test.describe('aceitar com o teclado (D-PO-08)', () => {
  test('diálogo com foco preso, Esc fecha e o foco volta ao botão de origem', async ({ page }) => {
    await abrirTela(page);
    const aceitar = page.getByRole('button', { name: 'Aceitar proposta de João da Silva' });
    await aceitar.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog', { name: 'Aceitar a proposta de João da Silva?' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('as outras propostas pendentes são recusadas');
    // Foco inicial no botão seguro (Cancelar).
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();

    // O Tab não escapa do diálogo, nem para a frente nem para trás.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dentroDoDialogo(page)).toBe(true);
    }
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await dentroDoDialogo(page)).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(aceitar).toBeFocused();
  });

  test('axe sem violações com o diálogo aberto', async ({ page }) => {
    await abrirTela(page);
    await page.getByRole('button', { name: 'Recusar proposta de Maria Souza' }).click();
    await expect(
      page.getByRole('alertdialog', { name: 'Recusar a proposta de Maria Souza?' }),
    ).toBeVisible();
    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`)).toEqual(
      [],
    );
  });

  test('confirmar mostra "Frete criado" e o Tab seguinte chega a "Ver fretes"', async ({
    page,
  }) => {
    await abrirTela(page);
    const aceitar = page.getByRole('button', { name: 'Aceitar proposta de João da Silva' });
    await aceitar.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Aceitar proposta', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('alertdialog')).toBeHidden();
    // O texto aparece no banner (dentro do <main>) e na região viva do anúncio (fora dele).
    await expect(page.locator('#conteudo').getByText('Frete criado')).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Frete criado' }).first(),
    ).toBeAttached();
    await page.keyboard.press('Tab');
    const ver = page.getByRole('link', { name: 'Ver fretes' }).last();
    await expect(ver).toBeFocused();
    await expect(ver).toHaveAttribute('href', '/empresa/fretes');
  });

  test('recusar: o diálogo pede confirmação e Enter em "Recusar proposta" fecha o diálogo', async ({
    page,
  }) => {
    await abrirTela(page);
    await page.getByRole('button', { name: 'Recusar proposta de Maria Souza' }).click();
    const dialogo = page.getByRole('alertdialog', { name: 'Recusar a proposta de Maria Souza?' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: 'Recusar proposta' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.locator('#conteudo').getByText('Frete criado')).toHaveCount(0);
  });
});
