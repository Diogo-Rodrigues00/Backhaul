import { entrarComoPerfil, expect, test } from './fixtures';

// Card 040: resumo da plataforma do admin no navegador, com a API de mock (localhost:4010).
// O axe nas 2 larguras e 2 temas roda em a11y.spec.ts, que lê `/admin` de e2e/rotas.ts.
test.describe('admin: resumo da plataforma', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'admin');
  });

  test('mostra os 11 números em quatro grupos, com listas de termos e definições', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Resumo da plataforma' }),
    ).toBeVisible();

    for (const grupo of ['Pessoas', 'Operação', 'Fretes', 'Dinheiro']) {
      await expect(page.getByRole('heading', { level: 2, name: grupo })).toBeVisible();
    }
    // `<dl>`: um `dt` por número (3+2+3+3 = 11).
    await expect(page.locator('main dt')).toHaveCount(11);
    await expect(page.locator('main dl')).toHaveCount(4);

    const comissaoRecebida = page.locator('main dt', {
      hasText: 'Comissão recebida (fretes entregues)',
    });
    await expect(comissaoRecebida).toBeVisible();
    await expect(comissaoRecebida.locator('xpath=following-sibling::dd')).toHaveText('R$ 175,00');
    await expect(
      page
        .locator('main dt', { hasText: 'Comissão retida (aguardando entrega)' })
        .locator('xpath=following-sibling::dd'),
    ).toHaveText('R$ 160,00');
    await expect(
      page
        .locator('main dt', { hasText: 'Certificações aguardando aprovação' })
        .locator('xpath=following-sibling::dd'),
    ).toHaveText('2');
  });

  test('o item "Resumo" está na navegação e não há botão "Sair" solto no corpo', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Resumo da plataforma' }),
    ).toBeVisible();

    const navegacao = page.getByRole('navigation', { name: 'Principal' });
    await expect(navegacao.getByRole('link', { name: 'Resumo' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('main').getByRole('button', { name: 'Sair' })).toHaveCount(0);
  });

  test('por Tab chega ao botão "Atualizar", que refaz a leitura', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 2, name: 'Pessoas' })).toBeVisible();

    const atualizar = page.getByRole('button', { name: 'Atualizar' });
    let achou = false;
    for (let i = 0; i < 30 && !achou; i += 1) {
      await page.keyboard.press('Tab');
      achou = await atualizar.evaluate((el) => el === document.activeElement);
    }
    expect(achou).toBe(true);

    let leituras = 0;
    page.on('request', (requisicao) => {
      if (requisicao.url().endsWith('/admin/resumo')) leituras += 1;
    });
    await page.keyboard.press('Enter');
    await expect.poll(() => leituras).toBe(1);
    // O foco continua no botão: a atualização não o move.
    await expect(atualizar).toBeFocused();
  });

  test('sem atualização automática: nenhuma nova leitura enquanto ninguém toca', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 2, name: 'Pessoas' })).toBeVisible();

    let leituras = 0;
    page.on('request', (requisicao) => {
      if (requisicao.url().endsWith('/admin/resumo')) leituras += 1;
    });
    await page.waitForTimeout(11_000);
    expect(leituras).toBe(0);
  });
});
