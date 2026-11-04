import { entrarComoPerfil, expect, test } from './fixtures';

// Card 026 (MVP-15): "Minhas propostas" do motorista no navegador, com a API de mock (localhost:4010).
// O mock devolve 8 propostas (mocks/fixtures/propostas.ts, minhasPropostasMock). Roda nos projetos
// "desktop" (1280 px, navegação no cabeçalho) e "estreito" (320 px, barra inferior com o "Mais").
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
