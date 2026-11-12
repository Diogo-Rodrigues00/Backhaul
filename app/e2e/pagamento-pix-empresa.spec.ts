import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 048: pagamento por Pix da empresa (painel, confirmação, 502 e reflow em 320 px).
// A API do mock não guarda estado entre chamadas e o Pix só existe no modo de teste do servidor, então
// aqui as duas rotas de frete são interceptadas no navegador (isolado dos outros specs, que dividem o
// mock da porta 4010). O app roda o dist/ de verdade; só as respostas de /fretes mudam.
// Desktop (1280 px) e estreito (320 px) rodam os mesmos cenários, nos dois temas.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LARGURA_ESTREITA = 320;
// Copia e cola longo e sem espaços: tem de quebrar dentro de 320 px.
const CODIGO_LONGO = '00020126580014br.gov.bcb.pix0136'.concat(
  'A1b2C3d4E5f6G7h8'.repeat(30),
  '6304ABCD',
);
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const CORS = { 'access-control-allow-origin': '*' };

type Situacao = { statusPagamento: null | 'pendente' | 'retido'; postStatus: 201 | 502 };

/** Responde GET /fretes/meus e POST /fretes/:id/pagamento; `situacao` é mutável durante o teste. */
async function simularFretes(page: Page, situacao: Situacao) {
  await page.route('**/fretes/meus', async (rota) => {
    if (rota.request().method() === 'OPTIONS') return rota.fallback();
    return rota.fulfill({
      status: 200,
      headers: CORS,
      json: {
        fretes: [
          {
            id: 'ffffffff-0000-4000-8000-0000000000a1',
            tipo_carga: 'Grãos',
            valor_final: 3500,
            status_entrega: 'aceito',
            coleta_em: null,
            entrega_em: null,
            criado_em: new Date().toISOString(),
            status_pagamento: situacao.statusPagamento,
            motorista: {
              id: '22222222-2222-4222-8222-222222222222',
              nome_completo: 'João da Silva',
              veiculo_tipo: 'carreta',
              veiculo_placa: 'ABC1D23',
            },
          },
        ],
      },
    });
  });
  await page.route('**/fretes/*/pagamento', async (rota) => {
    if (rota.request().method() === 'OPTIONS') return rota.fallback();
    if (situacao.postStatus === 502) {
      return rota.fulfill({ status: 502, headers: CORS, json: { erro: 'falha no gateway' } });
    }
    situacao.statusPagamento = 'pendente';
    return rota.fulfill({
      status: 201,
      headers: CORS,
      json: {
        transacao: {
          id: 'eeeeeeee-0000-4000-8000-0000000000a1',
          frete_id: 'ffffffff-0000-4000-8000-0000000000a1',
          valor_frete: 3500,
          percentual_comissao: 7.5,
          valor_comissao: 262.5,
          status_pagamento: 'pendente',
          criado_em: new Date().toISOString(),
        },
        pix: {
          copia_e_cola: CODIGO_LONGO,
          qr_code_base64: PNG_1X1,
          expira_em: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      },
    });
  });
}

async function pedirPagamento(page: Page) {
  await page.goto('/empresa/fretes');
  await page.getByRole('button', { name: 'Pagar frete de Grãos' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Pagar frete' }).click();
}

async function axeSemViolacoes(page: Page, dialogoAberto = false) {
  // O diálogo some com transição e os botões trocam de cor com transição: o axe mede o contraste do que
  // está na tela naquele instante, então espera tudo assentar antes.
  if (!dialogoAberto) await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.waitForTimeout(600);
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  expect(
    resultado.violations.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes
          .map((n) => `${n.target.join(' ')} ${JSON.stringify(n.any[0]?.data ?? {})} ${n.html}`)
          .join(' | ')})`,
    ),
  ).toEqual([]);
}

async function semRolagemHorizontal(page: Page, projeto: string) {
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(projeto === 'estreito' ? LARGURA_ESTREITA : 1280);
}

for (const esquema of ['light', 'dark'] as const) {
  test.describe(`pagamento por Pix da empresa, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });

    test.beforeEach(async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await entrarComoPerfil(page, 'empresa');
    });

    test('painel Pix aberto: QR, código longo, comissão da API, cópia sem roubar o foco, axe e reflow', async ({
      page,
    }, info) => {
      await simularFretes(page, { statusPagamento: null, postStatus: 201 });
      await pedirPagamento(page);

      const painel = page.getByRole('group', { name: 'Pagamento por Pix' });
      await expect(painel).toBeVisible();
      await expect(
        painel.getByRole('img', { name: 'QR Code do Pix de R$ 3.500,00' }),
      ).toBeVisible();
      await expect(painel.getByText(CODIGO_LONGO)).toBeVisible();
      await expect(painel.getByText('7,5%')).toBeVisible();
      await expect(painel.getByText('R$ 262,50')).toBeVisible();
      await expect(painel.getByText('Aguardando confirmação do pagamento…')).toBeVisible();
      await semRolagemHorizontal(page, info.project.name);
      const caixa = await painel.boundingBox();
      expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(
        info.project.name === 'estreito' ? LARGURA_ESTREITA : 1280,
      );
      await axeSemViolacoes(page);

      // Copiar: o foco fica no botão, o texto confirma e a área de transferência tem o código.
      const copiar = painel.getByRole('button', { name: 'Copiar código Pix' });
      await copiar.focus();
      await page.keyboard.press('Enter');
      await expect(painel.getByText('Código Pix copiado.')).toBeVisible();
      await expect(copiar).toBeFocused();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(CODIGO_LONGO);
      await axeSemViolacoes(page);
    });

    test('Pagamento confirmado: a lista vira "retido", o painel some e o resumo fica', async ({
      page,
    }, info) => {
      const situacao: Situacao = { statusPagamento: null, postStatus: 201 };
      await simularFretes(page, situacao);
      await pedirPagamento(page);
      await expect(page.getByRole('group', { name: 'Pagamento por Pix' })).toBeVisible();

      // A empresa pagou no banco: a próxima leitura (a cada 5 s) já traz `retido`.
      situacao.statusPagamento = 'retido';
      // O texto também está na região viva do anúncio: o banner é o que fica na lista.
      const banner = page
        .getByRole('list', { name: 'Fretes da empresa' })
        .getByText('Pagamento confirmado');
      await expect(banner).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('group', { name: 'Pagamento por Pix' })).toHaveCount(0);
      await expect(page.getByRole('group', { name: 'Resumo do pagamento' })).toBeVisible();
      await semRolagemHorizontal(page, info.project.name);
      await axeSemViolacoes(page);
    });

    test('502: o diálogo fica aberto com a mensagem e "Tentar de novo"', async ({ page }, info) => {
      await simularFretes(page, { statusPagamento: null, postStatus: 502 });
      await pedirPagamento(page);

      const dialogo = page.getByRole('alertdialog');
      await expect(
        dialogo.getByText('Serviço de pagamento indisponível, tente novamente'),
      ).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
      await semRolagemHorizontal(page, info.project.name);
      await axeSemViolacoes(page, true);
    });
  });
}
