import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 032: o admin aprova ou recusa certificações pendentes (MVP-20). A API é o mock em localhost:4010,
// sem estado para o token `mock-admin`: a fila traz 2 pendentes (com cpf e cnh, como o backend) e o POST
// responde 200 sem tirar ninguém da fila. Estados vazio e erro vêm de `page.route` sobre a resposta do
// próprio mock (mantém os cabeçalhos de CORS). Tudo aqui é feito pelo teclado.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const CPF_E_CNH = ['98765432100', '55566677788', '52998224725', '11122233344'];
const NOME_MARIA = 'Transporte de Cargas Indivisíveis de Maria Souza';

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'admin');
  await page.goto('/admin/certificacoes');
  await expect(h1(page)).toHaveText('Aprovações');
  // A fila chega depois da hidratação.
  await expect(page.getByRole('heading', { level: 3, name: 'Maria Souza' })).toBeVisible();
}

/** Troca a resposta do GET da fila (o POST e o preflight de CORS seguem para o mock). */
async function responderFila(page: Page, resposta: { status?: number; json: unknown }) {
  await page.route('**/certificacoes/pendentes', async (rota) => {
    if (rota.request().method() !== 'GET') return rota.continue();
    const original = await rota.fetch();
    return rota.fulfill({
      response: original,
      status: resposta.status ?? 200,
      json: resposta.json,
    });
  });
}

async function violacoesDoAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`,
  );
}

test.describe('admin: aprovações de certificações', () => {
  test('lista na ordem da API, com botões de nome único e sem CPF nem CNH no HTML nem no console', async ({
    page,
  }) => {
    const registroDoConsole: string[] = [];
    page.on('console', (mensagem) => registroDoConsole.push(mensagem.text()));
    await abrir(page);

    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      'Maria Souza',
      'João da Silva',
    ]);
    await expect(page.getByText('XYZ9K88', { exact: true })).toBeVisible();
    await expect(page.getByText('ABC1D23', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Aprovar ${NOME_MARIA}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Recusar ${NOME_MARIA}` })).toBeVisible();
    // O menu tem o item "Aprovações" e ele marca a página atual.
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Aprovações' }),
    ).toHaveAttribute('aria-current', 'page');

    const html = await page.content();
    for (const valor of CPF_E_CNH) {
      expect(html).not.toContain(valor);
      expect(registroDoConsole.join('\n')).not.toContain(valor);
    }
  });

  test('aprovar pelo teclado: foco preso no diálogo, Esc devolve o foco, confirmar anuncia e leva o foco ao próximo cartão', async ({
    page,
  }) => {
    await abrir(page);
    const aprovar = page.getByRole('button', { name: `Aprovar ${NOME_MARIA}` });
    await aprovar.focus();
    await page.keyboard.press('Enter');

    const dialogo = page.getByRole('alertdialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(`Aprovar ${NOME_MARIA}?`);
    await expect(dialogo).toContainText(
      'O motorista passa a ver cargas que exigem essa certificação.',
    );
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => document.activeElement?.closest('[role="alertdialog"]') !== null),
      ).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(aprovar).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(dialogo).toBeVisible();
    const envio = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('/certificacoes/pendentes/'),
    );
    await dialogo.getByRole('button', { name: 'Aprovar', exact: true }).focus();
    await page.keyboard.press('Enter');

    const requisicao = await envio;
    expect(requisicao.postDataJSON()).toEqual({ acao: 'aprovar' });
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'Certificação aprovada',
    );
    await expect(dialogo).toBeHidden();
    await expect(page.getByRole('article', { name: 'João da Silva' })).toBeFocused();
  });

  test('recusar: o foco inicial é "Cancelar" e o diálogo avisa que o envio é apagado', async ({
    page,
  }) => {
    await abrir(page);
    await page
      .getByRole('button', { name: 'Recusar MOPP - Classe 8 Corrosivos de João da Silva' })
      .click();

    const dialogo = page.getByRole('alertdialog');
    await expect(dialogo).toContainText('O envio é apagado e o motorista pode mandar de novo.');
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  });

  test('em 320 px não há rolagem horizontal, nem com nome e número compridos sem espaços', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.route('**/certificacoes/pendentes', async (rota) => {
      if (rota.request().method() !== 'GET') return rota.continue();
      const original = await rota.fetch();
      const corpo = (await original.json()) as {
        certificacoes: { numero_certificado: string; motorista: { nome_completo: string } }[];
      };
      corpo.certificacoes[0]!.motorista.nome_completo = 'k'.repeat(300);
      corpo.certificacoes[0]!.numero_certificado = 'n'.repeat(60);
      return rota.fulfill({ response: original, json: corpo });
    });
    await entrarComoPerfil(page, 'admin');
    await page.goto('/admin/certificacoes');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();

    const largura = await page.evaluate(
      () => (document.scrollingElement ?? document.documentElement).scrollWidth,
    );
    expect(largura).toBeLessThanOrEqual(320);
  });

  for (const esquema of ['light', 'dark'] as const) {
    test.describe(`axe, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
      test.use({ colorScheme: esquema });

      test('lista', async ({ page }) => {
        await abrir(page);
        expect(await violacoesDoAxe(page)).toEqual([]);
      });

      test('diálogo aberto', async ({ page }) => {
        await abrir(page);
        await page.getByRole('button', { name: `Recusar ${NOME_MARIA}` }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        expect(await violacoesDoAxe(page)).toEqual([]);
      });

      test('vazio', async ({ page }) => {
        await responderFila(page, { json: { certificacoes: [] } });
        await entrarComoPerfil(page, 'admin');
        await page.goto('/admin/certificacoes');
        await expect(page.getByText('Nenhuma certificação aguardando aprovação')).toBeVisible();
        expect(await violacoesDoAxe(page)).toEqual([]);
      });

      test('erro', async ({ page }) => {
        await responderFila(page, { status: 500, json: { erro: 'erro interno' } });
        await entrarComoPerfil(page, 'admin');
        await page.goto('/admin/certificacoes');
        await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
        expect(await violacoesDoAxe(page)).toEqual([]);
      });
    });
  }
});
