import AxeBuilder from '@axe-core/playwright';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 028 (MVP-17): meus fretes da empresa e pagamento simulado, só pelo teclado, no navegador,
// com a API de mock (localhost:4010). Os valores do resumo são os da fixture do mock.
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('meus fretes (empresa)', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
  });

  test('lista os fretes com motorista e andamento; só o frete sem pagamento tem "Pagar frete"', async ({
    page,
  }) => {
    await page.goto('/empresa/fretes');
    await expect(page.getByRole('heading', { level: 1, name: 'Meus fretes' })).toBeVisible();

    const lista = page.getByRole('list', { name: 'Fretes da empresa' });
    await expect(lista.getByRole('article')).toHaveCount(3);
    await expect(lista.getByText('João da Silva')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /^Pagar frete/ })).toHaveCount(1);
    await expect(page.getByText('Comissão da plataforma')).toHaveCount(0);
  });

  test('paga só pelo teclado: confirmação sem comissão, resumo com o foco', async ({ page }) => {
    await page.goto('/empresa/fretes');
    const pagar = page.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' });
    await expect(pagar).toBeVisible();

    await pagar.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog');
    await expect(dialogo).toBeVisible();
    await expect(
      dialogo.getByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' }),
    ).toBeVisible();
    await expect(
      dialogo.getByText('A comissão é calculada pela plataforma após o pagamento.'),
    ).toBeVisible();
    await expect(dialogo.getByText(/\d\s*%/)).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze()).violations).toEqual([]);
    // O foco começa em "Cancelar"; Tab leva ao botão de confirmar.
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialogo.getByRole('button', { name: 'Pagar frete' })).toBeFocused();
    await page.keyboard.press('Enter');

    const resumo = page.getByRole('group', { name: 'Resumo do pagamento' });
    await expect(resumo).toBeVisible();
    await expect(resumo.getByText('Valor do frete')).toBeVisible();
    await expect(resumo.getByText('Percentual de comissão')).toBeVisible();
    await expect(resumo.getByText('Comissão da plataforma')).toBeVisible();
    await expect(resumo.getByText('Situação do pagamento')).toBeVisible();
    await expect(dialogo).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze()).violations).toEqual([]);

    // O foco vai para o título do resumo (anunciado como "Resumo do pagamento").
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.textContent ?? ''))
      .toBe('Resumo do pagamento');
  });
});
