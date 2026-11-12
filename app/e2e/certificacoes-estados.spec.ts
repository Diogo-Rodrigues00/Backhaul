import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 046 (ressalvas do 031): axe em cada estado de /motorista/certificacoes, nos dois temas e nos dois
// projetos (1280 e 320 px), e o foco ao "Cancelar reenvio". Cada estado é forçado com `page.route` sobre o
// mock sem estado do token `mock-motorista`. O axe só roda depois de o corpo da tela carregar (não só o h1).
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const API = 'http://localhost:4010';
const CORS = { 'access-control-allow-origin': '*' };
const NOME_MOPP_8 = 'MOPP - Classe 8 Corrosivos';

async function responder(
  page: Page,
  padrao: string,
  metodo: 'GET' | 'POST',
  status: number,
  json: unknown,
) {
  await page.route(padrao, async (rota) => {
    const requisicao = rota.request();
    if (requisicao.method() !== metodo) return rota.fallback();
    return rota.fulfill({ status, headers: CORS, json });
  });
}

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'motorista');
  await page.goto('/motorista/certificacoes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Minhas certificações');
}

async function violacoes(page: Page) {
  // Espera as transições terminarem (o axe mediria um quadro no meio do fade) e volta ao topo: o clique
  // do teste rolou a página, e uma rolagem qualquer pode deixar um campo sob o cabeçalho ou a barra fixos.
  await page.waitForFunction(() =>
    document.getAnimations().every((animacao) => animacao.playState !== 'running'),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`,
  );
}

const estados: {
  nome: string;
  preparar: (page: Page) => Promise<void>;
  pronto: (page: Page) => Promise<void>;
}[] = [
  {
    nome: 'lista vazia',
    preparar: (page) =>
      responder(page, `${API}/certificacoes/minhas`, 'GET', 200, { certificacoes: [] }),
    pronto: async (page) => {
      await expect(page.getByText('Você ainda não enviou certificações')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible();
    },
  },
  {
    nome: 'erro ao carregar a lista',
    preparar: (page) =>
      responder(page, `${API}/certificacoes/minhas`, 'GET', 500, { erro: 'erro interno' }),
    pronto: async (page) => {
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    },
  },
  {
    nome: 'erro ao carregar o catálogo',
    preparar: (page) =>
      responder(page, `${API}/certificacoes`, 'GET', 500, { erro: 'erro interno' }),
    pronto: async (page) => {
      await expect(
        page.getByRole('heading', { level: 2, name: 'Suas certificações' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    },
  },
  {
    nome: 'modo reenvio',
    preparar: async () => undefined,
    pronto: async (page) => {
      await expect(page.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible();
      await page.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` }).click();
      await expect(page.getByRole('button', { name: 'Cancelar reenvio' })).toBeVisible();
    },
  },
  {
    nome: 'erro 409 no envio',
    preparar: (page) =>
      responder(page, `${API}/certificacoes/minhas`, 'POST', 409, {
        erro: 'certificação já aprovada e dentro da validade',
      }),
    pronto: async (page) => {
      await expect(page.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible();
      await page.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` }).click();
      await page.getByLabel('Dia', { exact: true }).fill('1');
      await page.getByLabel('Mês', { exact: true }).fill('1');
      await page.getByLabel('Ano', { exact: true }).fill(String(new Date().getFullYear() + 2));
      await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
      await expect(
        page.getByText('certificação já aprovada e dentro da validade').first(),
      ).toBeVisible();
    },
  },
];

for (const esquema of ['light', 'dark'] as const) {
  test.describe(`axe nos estados de certificações, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });

    for (const { nome, preparar, pronto } of estados) {
      test(`sem violações: ${nome}`, async ({ page }) => {
        await preparar(page);
        await abrir(page);
        await pronto(page);
        expect(await violacoes(page)).toEqual([]);
      });
    }
  });
}

test('"Cancelar reenvio" devolve o foco ao botão "Reenviar" de origem', async ({ page }) => {
  await abrir(page);
  const origem = page.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` });
  await expect(origem).toBeVisible();
  await origem.focus();
  await page.keyboard.press('Enter');
  const cancelar = page.getByRole('button', { name: 'Cancelar reenvio' });
  await expect(cancelar).toBeVisible();

  await cancelar.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancelar reenvio' })).toHaveCount(0);
  await expect(origem).toBeFocused();

  // Com a outra certificação a origem muda e o foco acompanha.
  const outra = page.getByRole('button', { name: 'Reenviar Transporte de Cargas Indivisíveis' });
  await outra.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Cancelar reenvio' }).click();
  await expect(outra).toBeFocused();
});
