import AxeBuilder from '@axe-core/playwright';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 026 (MVP-15): "Minhas propostas" do motorista no navegador, com a API de mock (localhost:4010).
// O mock devolve 8 propostas (mocks/fixtures/propostas.ts, minhasPropostasMock). Roda nos projetos
// "desktop" (1280 px, navegação no cabeçalho) e "estreito" (320 px, barra inferior com o "Mais").
// A regra de axe (WCAG 2.2 AA) é a mesma de e2e/a11y.spec.ts.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('minhas propostas do motorista', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/propostas');
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
  });

  test('lista as 8 propostas e cada uma tem empresa, status em texto e valores', async ({
    page,
  }) => {
    const lista = page.getByRole('list', { name: 'Propostas' });
    await expect(lista.getByRole('article')).toHaveCount(8);
    await expect(page.getByText('Empresa: Transportes Rápidos LTDA').first()).toBeVisible();
    await expect(page.getByText('Pendente').first()).toBeVisible();
    await expect(page.getByText('Recusada').first()).toBeVisible();
    await expect(page.getByText('Valor oferecido pela empresa').first()).toBeVisible();
  });

  test('proposta aceita com frete tem "Ver frete" que leva a Meus fretes', async ({ page }) => {
    const link = page.getByRole('link', { name: /Ver frete de/ }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/motorista/fretes');
  });

  test('o botão de atualizar e a legenda de atualização automática aparecem', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible();
    await expect(page.getByText(/Esta tela atualiza sozinha a cada 10 s/)).toBeVisible();
  });

  test('desktop: "Minhas propostas" e "Disponibilidade" estão no menu do cabeçalho', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'cabeçalho só acima de 960 px');
    const cabecalho = page.getByRole('navigation', { name: 'Principal' }).first();
    await expect(cabecalho.getByRole('link', { name: 'Minhas propostas' })).toBeVisible();
    await expect(cabecalho.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mais' })).toHaveCount(0);
  });

  test('celular: "Mais" abre por teclado, Esc fecha e devolve o foco ao botão', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
    const mais = page.getByRole('button', { name: 'Mais' });
    const disponibilidade = page.getByRole('link', { name: 'Disponibilidade' });
    await expect(disponibilidade).toBeHidden();

    await mais.focus();
    await expect(mais).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(mais).toHaveAttribute('aria-expanded', 'true');
    await expect(disponibilidade).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(disponibilidade).toBeHidden();
    await expect(mais).toBeFocused();
    await expect(mais).toHaveAttribute('aria-expanded', 'false');
  });
});

// Navegação de verdade pelo teclado: começa numa tela que não é Minhas propostas e chega até ela (ou até
// Disponibilidade) só com Tab e Enter.
test.describe('navegação por teclado até a tela', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('desktop: foco no link "Minhas propostas" do menu, Enter abre a tela', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'cabeçalho só acima de 960 px');
    const link = page
      .getByRole('navigation', { name: 'Principal' })
      .first()
      .getByRole('link', { name: 'Minhas propostas' });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/motorista\/propostas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
  });

  test('celular: "Mais" por teclado, Tab até "Disponibilidade", Enter abre a tela', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
    const mais = page.getByRole('button', { name: 'Mais' });
    await mais.focus();
    await page.keyboard.press('Enter');
    await expect(mais).toHaveAttribute('aria-expanded', 'true');

    const disponibilidade = page.getByRole('link', { name: 'Disponibilidade' });
    await page.keyboard.press('Tab');
    await expect(disponibilidade).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/motorista\/disponibilidades$/);
  });
});

// Axe com o "Mais" aberto, no celular, nos dois temas (o painel é o que a tela ganha ao abrir).
test.describe('axe com o "Mais" da barra aberto (320 px)', () => {
  for (const esquema of ['light', 'dark'] as const) {
    test.describe(`tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
      test.use({ colorScheme: esquema });

      test('sem violações com o painel aberto', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
        await entrarComoPerfil(page, 'motorista');
        await page.goto('/motorista/propostas');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        await page.getByRole('button', { name: 'Mais' }).click();
        await expect(page.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();

        const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
        expect(
          resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`),
        ).toEqual([]);
      });
    });
  }
});
