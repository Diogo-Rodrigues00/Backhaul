import { entrarComoPerfil, expect, test } from './fixtures';

// Página inicial pública (`/`): marca, frase do produto e as portas "Entrar" e "Criar conta".
// O axe nos dois temas e em 320 px já cobre `/` pela lista de e2e/rotas.ts.
const H1 = 'A urgência decide quem sai na frente';

test.describe('visitante', () => {
  test('mostra um h1, a frase do produto e os dois botões grandes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('A urgência decide').first()).toBeAttached();

    for (const nome of ['Entrar', 'Criar conta']) {
      const botao = page.getByRole('main').getByRole('link', { name: nome });
      await expect(botao).toBeVisible();
      const caixa = await botao.boundingBox();
      expect(caixa!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('"Entrar" abre /entrar e "Criar conta" abre /cadastro', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();

    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test('o teclado alcança os dois botões e o foco aparece', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    const entrar = page.getByRole('main').getByRole('link', { name: 'Entrar' });
    await entrar.focus();
    await expect(entrar).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('main').getByRole('link', { name: 'Criar conta' })).toBeFocused();
  });
});

test.describe('quem já tem sessão', () => {
  test('não vê a apresentação nem por um instante: vai direto à sua área', async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    // Segura a restauração da sessão: o HTML estático da `/` já está na tela, mas escondido.
    await page.route('**/eu', async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 1500));
      await rota.continue();
    });
    await page.goto('/');

    const apresentacao = page.getByRole('heading', { level: 1, name: H1 });
    await expect(apresentacao).toBeHidden();
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeHidden();
    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cargas próximas' })).toBeVisible();
  });
});
