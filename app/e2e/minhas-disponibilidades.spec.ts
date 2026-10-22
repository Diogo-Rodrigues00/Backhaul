import { entrarComoPerfil, expect, test } from './fixtures';

// Card 022 (MVP-11, D-PO-03): minhas disponibilidades do motorista no navegador, com a API de mock
// (localhost:4010). Fixtures: Uberlândia (aberta, mais recente), Araguari (aberta) e Uberaba
// (expirada), nessa ordem.
test.describe('minhas disponibilidades', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
  });

  test('lista as três, indica a ativa em texto e escolher outra troca o rótulo "Ativa"', async ({
    page,
  }) => {
    await page.goto('/motorista/disponibilidades');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minhas disponibilidades' }),
    ).toBeVisible();

    const lista = page.getByRole('list', { name: 'Disponibilidades publicadas' });
    await expect(lista.getByRole('listitem')).toHaveCount(3);
    const uberlandia = lista.getByRole('listitem').nth(0);
    const uberaba = lista.getByRole('listitem').nth(1);
    const araguari = lista.getByRole('listitem').nth(2);

    // Sem escolha manual, a ativa é a mais recente aberta e no prazo.
    await expect(uberlandia.getByText('Ativa', { exact: true })).toBeVisible();
    await expect(araguari.getByText('Ativa', { exact: true })).toHaveCount(0);
    await expect(uberaba.getByText('Expirada', { exact: true })).toBeVisible();
    await expect(uberaba.getByRole('button', { name: /Usar esta/ })).toBeDisabled();

    await araguari
      .getByRole('button', { name: 'Usar esta disponibilidade perto de Araguari - MG' })
      .click();

    await expect(araguari.getByText('Ativa', { exact: true })).toBeVisible();
    await expect(uberlandia.getByText('Ativa', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Ativa', { exact: true })).toHaveCount(1);
    await expect(
      uberlandia.getByRole('button', {
        name: 'Usar esta disponibilidade perto de Uberlândia - MG',
      }),
    ).toBeEnabled();

    // A escolha sobrevive a recarregar a página.
    await page.reload();
    await expect(lista.getByRole('listitem')).toHaveCount(3);
    await expect(
      lista.getByRole('listitem').nth(2).getByText('Ativa', { exact: true }),
    ).toBeVisible();
  });

  test('"Publicar disponibilidade" é um link para a tela de publicação', async ({ page }) => {
    await page.goto('/motorista/disponibilidades');
    const link = page.getByRole('link', { name: 'Publicar disponibilidade' }).first();
    await expect(link).toHaveAttribute('href', '/motorista/disponibilidades/nova');
  });

  test('alcança "Usar esta" pelo teclado em 320 px, sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/motorista/disponibilidades');
    const botao = page.getByRole('button', {
      name: 'Usar esta disponibilidade perto de Araguari - MG',
    });
    await expect(botao).toBeVisible();
    await botao.focus();
    await expect(botao).toBeFocused();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(320);
  });
});
