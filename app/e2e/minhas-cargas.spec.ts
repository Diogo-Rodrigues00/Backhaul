import { entrarComoPerfil, expect, test } from './fixtures';

// Card 020 (MVP-09): minhas cargas da empresa no navegador, com a API de mock (localhost:4010).
const CARGA_URGENTE_ID = 'cccccccc-0000-4000-8000-000000000001';

test.describe('minhas cargas', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
  });

  test('lista as cargas da empresa e o link "Ver propostas" leva à URL com ?id=', async ({
    page,
  }) => {
    await page.goto('/empresa/cargas');
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas cargas' })).toBeVisible();

    const lista = page.getByRole('list', { name: 'Cargas publicadas' });
    await expect(lista).toBeVisible();
    await expect(lista.getByRole('listitem')).toHaveCount(4);
    await expect(page.getByText('Expirada', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Ver propostas de Produtos inflamáveis' }).click();
    await expect(page).toHaveURL(new RegExp(`/empresa/cargas/detalhe\\?id=${CARGA_URGENTE_ID}$`));
  });

  test('"Atualizar" está presente e a tela não se atualiza sozinha (Q5)', async ({ page }) => {
    await page.goto('/empresa/cargas');
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible();

    // Sem atualização automática: nenhuma nova leitura de /cargas/minhas enquanto ninguém toca.
    let leituras = 0;
    page.on('request', (requisicao) => {
      if (requisicao.url().endsWith('/cargas/minhas')) leituras += 1;
    });
    await page.waitForTimeout(11_000);
    expect(leituras).toBe(0);
  });
});
