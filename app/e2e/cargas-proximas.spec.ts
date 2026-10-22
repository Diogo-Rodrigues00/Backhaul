import { entrarComoPerfil, expect, test } from './fixtures';

// Card 024 (MVP-12, D-PO-03/05): cargas próximas do motorista no navegador, com a API de mock
// (localhost:4010). Fixture: disponibilidade ativa em Uberlândia (raio de 80 km) e dez cargas na
// ordem do contrato (crítico, urgente, normal; dentro de cada uma, a mais perto primeiro).
const TIPOS_NA_ORDEM = [
  'Insumos hospitalares',
  'Combustível a granel',
  'Produtos inflamáveis',
  'Fertilizantes ensacados',
  'Cimento ensacado',
  'Grãos',
  'Bebidas paletizadas',
  'Ração animal',
  'Material de construção',
  'Eletrodomésticos',
];

test.describe('cargas próximas', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
  });

  test('lista as dez cargas na ordem da API, com urgência antes do tipo e o contexto da busca', async ({
    page,
  }) => {
    await page.goto('/motorista/cargas');
    await expect(page.getByRole('heading', { level: 1, name: 'Cargas próximas' })).toBeVisible();

    const lista = page.getByRole('list', { name: 'Cargas próximas' });
    await expect(lista.getByRole('article')).toHaveCount(10);
    const titulos = lista.getByRole('heading', { level: 2 });
    await expect(titulos).toHaveText(TIPOS_NA_ORDEM);

    // Urgência em texto, no primeiro cartão (crítico) e no último (normal).
    await expect(lista.getByRole('article').first().getByText('Crítico')).toBeVisible();
    await expect(lista.getByRole('article').last().getByText('Normal')).toBeVisible();
    await expect(lista.getByRole('article').first().getByText('4,3 km')).toBeVisible();

    await expect(
      page.getByText(/Buscando perto de Uberlândia - MG, raio de 80 km, até /),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible();
  });

  test('"Trocar disponibilidade" é um link para as disponibilidades do motorista', async ({
    page,
  }) => {
    await page.goto('/motorista/cargas');
    const link = page.getByRole('link', { name: 'Trocar disponibilidade' });
    await expect(link).toHaveAttribute('href', '/motorista/disponibilidades');
    await link.click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minhas disponibilidades' }),
    ).toBeVisible();
  });

  test('carga com proposta pendente do motorista mostra "Proposta enviada"', async ({ page }) => {
    await page.goto('/motorista/cargas');
    const lista = page.getByRole('list', { name: 'Cargas próximas' });
    await expect(lista.getByRole('article')).toHaveCount(10);

    await expect(page.getByText('Proposta enviada', { exact: true })).toHaveCount(1);
    await expect(
      page
        .getByRole('article', { name: 'Produtos inflamáveis' })
        .getByText('Proposta enviada', { exact: true }),
    ).toBeVisible();
  });

  test('"Atualizar" é alcançável pelo teclado e mantém a lista', async ({ page }) => {
    await page.goto('/motorista/cargas');
    const lista = page.getByRole('list', { name: 'Cargas próximas' });
    await expect(lista.getByRole('article')).toHaveCount(10);

    const atualizar = page.getByRole('button', { name: 'Atualizar' });
    await atualizar.focus();
    await expect(atualizar).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(lista.getByRole('article')).toHaveCount(10);
  });

  test('em 320 px não há rolagem horizontal e a barra de contexto cabe', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/motorista/cargas');
    await expect(
      page.getByRole('list', { name: 'Cargas próximas' }).getByRole('article'),
    ).toHaveCount(10);
    const link = page.getByRole('link', { name: 'Trocar disponibilidade' });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(320);
  });
});
