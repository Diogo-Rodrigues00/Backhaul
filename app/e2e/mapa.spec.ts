import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 035 (MVP-23, ADR 0017): "Ver no mapa" abre sob demanda. O CI não tem internet garantida:
// toda requisição ao OpenStreetMap é interceptada e respondida com um PNG de 1x1 pixel, então o
// teste confere texto, estado e o que foi (ou não) baixado, sem depender de rede.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==',
  'base64',
);

interface Espiao {
  ladrilhos: string[];
  scripts: string[];
}

// Bloqueia o mundo externo e anota ladrilhos e scripts baixados.
async function espiar(page: Page): Promise<Espiao> {
  const espiao: Espiao = { ladrilhos: [], scripts: [] };
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (rota) => {
    const url = rota.request().url();
    if (url.includes('tile.openstreetmap.org')) {
      espiao.ladrilhos.push(url);
      return rota.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    }
    return rota.abort();
  });
  page.on('request', (requisicao) => {
    if (requisicao.resourceType() === 'script') espiao.scripts.push(requisicao.url());
  });
  return espiao;
}

test.describe('mapa sob demanda: Minhas cargas (empresa)', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
  });

  test('sem clique não baixa mapa; com clique abre, mostra a rota em texto e fecha', async ({
    page,
  }) => {
    const espiao = await espiar(page);
    await page.goto('/empresa/cargas');
    const lista = page.getByRole('list', { name: 'Cargas publicadas' });
    await expect(lista.getByRole('listitem')).toHaveCount(4);

    // Antes do clique: nenhum ladrilho, nenhum mapa, botão fechado.
    const botao = page.getByRole('button', {
      name: /^Ver no mapa da rota de Produtos inflamáveis/,
    });
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('img', { name: /^Mapa da rota de/ })).toHaveCount(0);
    expect(espiao.ladrilhos).toEqual([]);
    const scriptsAntes = espiao.scripts.length;

    await botao.click();
    const mapa = page.getByRole('img', { name: /^Mapa da rota de .* a .*/ });
    await expect(mapa).toHaveCount(1);
    await expect(mapa).toBeVisible();
    await expect(page.getByText('© OpenStreetMap contributors')).toBeVisible();
    // O código do mapa veio num chunk novo e só agora.
    expect(espiao.scripts.length).toBeGreaterThan(scriptsAntes);
    await expect.poll(() => espiao.ladrilhos.length).toBeGreaterThan(0);

    const aberto = page.getByRole('button', {
      name: /^Fechar mapa da rota de Produtos inflamáveis/,
    });
    await expect(aberto).toHaveAttribute('aria-expanded', 'true');
    await expect(aberto).toHaveAttribute('aria-controls', /^mapa-/);

    // A informação do mapa também está em texto: origem e destino no próprio cartão.
    await expect(
      page.getByRole('article', { name: 'Produtos inflamáveis' }).getByText(/Uberlândia - MG/),
    ).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`)).toEqual(
      [],
    );

    // O mapa não prende o foco: o botão continua sendo o mesmo e fecha pelo teclado.
    await aberto.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('img', { name: /^Mapa da rota de/ })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Ver no mapa da rota de Produtos inflamáveis/ }),
    ).toBeFocused();
  });

  test('um mapa por vez e sem rolagem horizontal em 320 px', async ({ page }) => {
    await espiar(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/empresa/cargas');
    await expect(
      page.getByRole('list', { name: 'Cargas publicadas' }).getByRole('listitem'),
    ).toHaveCount(4);

    const botoes = page.getByRole('button', { name: /^Ver no mapa da rota de/ });
    await botoes.nth(0).click();
    await expect(page.getByRole('img', { name: /^Mapa da rota de/ })).toHaveCount(1);
    await page
      .getByRole('button', { name: /^Ver no mapa da rota de/ })
      .first()
      .click();
    await expect(page.getByRole('img', { name: /^Mapa da rota de/ })).toHaveCount(1);

    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(320);
  });
});

test.describe('mapa sob demanda: Cargas próximas (motorista)', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
  });

  test('"Ver cargas no mapa" mostra local e raio em texto e abre o mapa geral', async ({
    page,
  }) => {
    const espiao = await espiar(page);
    await page.goto('/motorista/cargas');
    await expect(
      page.getByRole('list', { name: 'Cargas próximas' }).getByRole('article'),
    ).toHaveCount(10);
    expect(espiao.ladrilhos).toEqual([]);

    const botao = page.getByRole('button', { name: 'Ver cargas no mapa' });
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await botao.click();

    await expect(
      page.getByRole('img', { name: /^Mapa das cargas num raio de 80 km/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fechar mapa das cargas' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByText(/Legenda: ●: sua disponibilidade/)).toBeVisible();
    // Local e raio continuam em texto na barra de contexto.
    await expect(page.getByText(/Buscando perto de Uberlândia - MG, raio de 80 km/)).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`)).toEqual(
      [],
    );
  });
});
