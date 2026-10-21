import AxeBuilder from '@axe-core/playwright';
import { entrarComoPerfil, expect, test } from './fixtures';
import { rotas } from './rotas';

// Toda rota de e2e/rotas.ts x tema claro/escuro x 1280 px/320 px (ADR 0012).
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LARGURA_ESTREITA = 320;

for (const esquema of ['light', 'dark'] as const) {
  test.describe(`tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });

    for (const { caminho, perfil } of rotas) {
      test(`axe sem violações em ${caminho}`, async ({ page }) => {
        await entrarComoPerfil(page, perfil);
        await page.goto(caminho);
        // Espera a hidratação: a tela sempre tem um h1.
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
        expect(
          resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`),
        ).toEqual([]);
      });
    }
  });
}

test.describe('reflow em 320 px', () => {
  for (const { caminho, perfil } of rotas) {
    test(`sem rolagem horizontal em ${caminho}`, async ({ page }, info) => {
      test.skip(info.project.name !== 'estreito', 'só vale na largura de 320 px');
      await entrarComoPerfil(page, perfil);
      await page.goto(caminho);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(largura).toBeLessThanOrEqual(LARGURA_ESTREITA);
    });
  }
});
