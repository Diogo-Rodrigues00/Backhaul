import { entrarComoPerfil, expect, test } from './fixtures';

// Card 049: a barra de abas inferior (sticky) nunca esconde o fim da página nem o campo focado. Só vale
// abaixo de 960 px (acima, a navegação fica no cabeçalho); por isso roda no projeto estreito (320 px).
test.describe('folga sob a barra de abas inferior', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'estreito', 'a barra inferior só existe em tela estreita');
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/chave-pix');
    await expect(page.getByRole('button', { name: 'Salvar chave Pix' })).toBeVisible();
  });

  const barra = (page: import('@playwright/test').Page) => page.locator('[data-bp="so-barra"]');

  test('a altura real da barra vira --altura-barra no html (fonte do scroll-padding)', async ({
    page,
  }) => {
    const caixa = await barra(page).boundingBox();
    expect(caixa).not.toBeNull();
    // O onLayout chega logo depois da hidratação.
    await expect
      .poll(() =>
        page.evaluate(() =>
          parseFloat(document.documentElement.style.getPropertyValue('--altura-barra')),
        ),
      )
      .toBeCloseTo(caixa!.height, 0);
    const publicada = caixa!.height;
    // Em 320 px os rótulos quebram: a barra passa do mínimo de 63 px, e é por isso que se mede.
    expect(publicada).toBeGreaterThanOrEqual(63);
  });

  test('rolada até o fim, nenhum conteúdo fica sob a barra', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const { fimDoConteudo, topoDaBarra } = await page.evaluate(() => {
      const principal = document.querySelector('[role="main"]')!.getBoundingClientRect();
      const barraEl = document.querySelector('[data-bp="so-barra"]')!.getBoundingClientRect();
      return { fimDoConteudo: principal.bottom, topoDaBarra: barraEl.top };
    });
    expect(fimDoConteudo).toBeLessThanOrEqual(topoDaBarra);
  });

  test('o foco por teclado em um alvo abaixo da dobra o traz acima da barra', async ({ page }) => {
    const salvar = page.getByRole('button', { name: 'Salvar chave Pix' });
    await salvar.focus();
    const { baseDoAlvo, topoDaBarra } = await page.evaluate(() => {
      const foco = document.activeElement!.getBoundingClientRect();
      const barraEl = document.querySelector('[data-bp="so-barra"]')!.getBoundingClientRect();
      return { baseDoAlvo: foco.bottom, topoDaBarra: barraEl.top };
    });
    expect(baseDoAlvo).toBeLessThanOrEqual(topoDaBarra);
  });
});
