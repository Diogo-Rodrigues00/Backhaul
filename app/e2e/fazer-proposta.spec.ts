import AxeBuilder from '@axe-core/playwright';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 025 (MVP-13): proposta do motorista no navegador, com a API de mock (localhost:4010).
// "Grãos" (R$ 4.200,50) não tem proposta na fixture; "Produtos inflamáveis" já tem uma pendente.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ID_GRAOS = 'cccccccc-0000-4000-8000-000000000002';

test.describe('fazer proposta', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(
      page.getByRole('list', { name: 'Cargas próximas' }).getByRole('article'),
    ).toHaveCount(10);
  });

  test('contraproposta só por teclado: foco no campo, aviso de única, envio e foco em "Proposta enviada"', async ({
    page,
  }) => {
    const corpos: unknown[] = [];
    page.on('request', (requisicao) => {
      if (requisicao.method() === 'POST' && requisicao.url().endsWith('/propostas')) {
        corpos.push(requisicao.postDataJSON());
      }
    });
    const cartao = page.getByRole('article', { name: 'Grãos' });
    const botao = cartao.getByRole('button', { name: /^Contraproposta para Grãos/ });
    await expect(cartao.getByText('Só uma contraproposta por carga.')).toBeVisible();
    await botao.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog', { name: 'Enviar contraproposta?' });
    await expect(dialogo).toBeVisible();
    // O aviso aparece antes do envio e o foco inicial já está no campo do valor.
    await expect(
      dialogo.getByText(/Você só pode enviar uma contraproposta para esta carga/).first(),
    ).toBeVisible();
    const campo = dialogo.getByLabel('Valor proposto (R$)');
    await expect(campo).toBeFocused();
    await expect(campo).toHaveAttribute('inputmode', 'decimal');
    await expect(campo).toHaveAttribute('aria-describedby', /.+/);

    // Valor inválido: o erro fica junto do campo e nada é enviado.
    await page.keyboard.type('0');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialogo.getByRole('button', { name: 'Enviar contraproposta' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialogo.getByText('Informe um número maior que zero.')).toBeVisible();
    await expect(campo).toBeFocused();
    expect(corpos).toHaveLength(0);

    await campo.fill('3200,50');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(dialogo).toBeHidden();
    await expect(cartao.getByText('Proposta enviada', { exact: true })).toBeVisible();
    expect(corpos).toEqual([
      {
        chamado_carga_id: ID_GRAOS,
        chamado_disp_id: expect.any(String),
        tipo: 'contraproposta',
        valor_proposto: 3200.5,
      },
    ]);
    // Foco previsível: no bloco "Proposta enviada" do cartão, que ocupou o lugar dos botões.
    await expect(page.locator(`[id="proposta-enviada-${ID_GRAOS}"]`)).toBeFocused();
    await expect(cartao.getByRole('button')).toHaveCount(0);
  });

  test('aceitar o valor: confirma, não manda valor e o cartão vira "Proposta enviada"', async ({
    page,
  }) => {
    const corpos: unknown[] = [];
    page.on('request', (requisicao) => {
      if (requisicao.method() === 'POST' && requisicao.url().endsWith('/propostas')) {
        corpos.push(requisicao.postDataJSON());
      }
    });
    const cartao = page.getByRole('article', { name: 'Grãos' });
    await cartao.getByRole('button', { name: /^Aceitar R\$ 4\.200,50/ }).focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog', { name: 'Aceitar o valor oferecido?' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialogo.getByRole('button', { name: 'Aceitar R$ 4.200,50' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(dialogo).toBeHidden();
    await expect(cartao.getByText('Proposta enviada', { exact: true })).toBeVisible();
    expect(corpos).toEqual([
      { chamado_carga_id: ID_GRAOS, chamado_disp_id: expect.any(String), tipo: 'aceite' },
    ]);
    await expect(page.locator(`[id="proposta-enviada-${ID_GRAOS}"]`)).toBeFocused();
  });

  test('Esc fecha o diálogo sem enviar e devolve o foco ao botão que abriu', async ({ page }) => {
    let posts = 0;
    page.on('request', (requisicao) => {
      if (requisicao.method() === 'POST' && requisicao.url().endsWith('/propostas')) posts += 1;
    });
    const botao = page
      .getByRole('article', { name: 'Grãos' })
      .getByRole('button', { name: /^Contraproposta para Grãos/ });
    await botao.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alertdialog', { name: 'Enviar contraproposta?' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(botao).toBeFocused();
    expect(posts).toBe(0);
  });

  test('carga com proposta pendente não oferece botões de proposta', async ({ page }) => {
    const cartao = page.getByRole('article', { name: 'Produtos inflamáveis' });
    await expect(cartao.getByText('Proposta enviada', { exact: true })).toBeVisible();
    await expect(cartao.getByRole('button')).toHaveCount(0);
  });

  for (const esquema of ['light', 'dark'] as const) {
    test(`axe sem violações com o diálogo de contraproposta aberto (${esquema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page
        .getByRole('article', { name: 'Grãos' })
        .getByRole('button', { name: /^Contraproposta para Grãos/ })
        .click();
      const dialogo = page.getByRole('alertdialog', { name: 'Enviar contraproposta?' });
      await expect(dialogo).toBeVisible();
      await dialogo.getByLabel('Valor proposto (R$)').fill('0');
      await dialogo.getByRole('button', { name: 'Enviar contraproposta' }).click();
      await expect(dialogo.getByText('Informe um número maior que zero.')).toBeVisible();

      const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`),
      ).toEqual([]);
    });
  }
});
