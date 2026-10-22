import { entrarComoPerfil, expect, test } from './fixtures';

// Card 027 (MVP-16): fretes do motorista no navegador, com a API de mock (localhost:4010).
test.describe('meus fretes do motorista', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/fretes');
    await expect(page.getByRole('heading', { level: 1, name: 'Meus fretes' })).toBeVisible();
  });

  test('lista os três fretes; um botão com o próximo passo, entregue sem botão e nenhum cancelar', async ({
    page,
  }) => {
    const lista = page.getByRole('list', { name: 'Fretes' });
    await expect(lista.getByRole('article')).toHaveCount(3);

    await expect(
      page.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar entrega de Grãos' })).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Material de construção' }).getByRole('button'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /cancelar/i })).toHaveCount(0);
    await expect(page.getByText('Liberado ao motorista')).toBeVisible();
  });

  test('"Iniciar transporte" por teclado: diálogo, confirmação e foco de volta ao cartão', async ({
    page,
  }) => {
    const botao = page.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' });
    await botao.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog', {
      name: 'Iniciar o transporte de Produtos inflamáveis?',
    });
    await expect(dialogo).toBeVisible();
    // O foco inicial vai ao Cancelar; Tab chega a "Iniciar transporte" e Enter confirma.
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialogo.getByRole('button', { name: 'Iniciar transporte' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(dialogo).toBeHidden();
    const cartao = page.getByRole('article', { name: 'Produtos inflamáveis' });
    await expect(cartao.getByText('Status atualizado.')).toBeVisible();
    await expect(
      cartao.getByRole('button', { name: 'Confirmar entrega de Produtos inflamáveis' }),
    ).toBeVisible();
    await expect(cartao).toBeFocused();
  });

  test('Esc fecha o diálogo sem enviar nada e devolve o foco ao botão', async ({ page }) => {
    let patches = 0;
    page.on('request', (requisicao) => {
      if (requisicao.method() === 'PATCH') patches += 1;
    });
    const botao = page.getByRole('button', { name: 'Confirmar entrega de Grãos' });
    await botao.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('alertdialog', { name: 'Confirmar a entrega de Grãos?' });
    await expect(dialogo).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(botao).toBeFocused();
    expect(patches).toBe(0);
  });
});
