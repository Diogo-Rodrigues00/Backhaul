import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 042 (ADR 0016): chat da proposta em "Propostas da carga", empresa, no HTML exportado e no mock
// da API (sem estado: o POST responde 201 e a lista de mensagens volta igual). A conversa entre duas
// janelas fica no card 046. O comportamento roda uma vez, no desktop; o axe nos dois temas e o
// reflow em 320 px rodam também (e só) no projeto `estreito`.
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
function soNoDesktop() {
  // eslint-disable-next-line no-empty-pattern -- idem
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
  });
}

const CARGA_URGENTE_ID = 'cccccccc-0000-4000-8000-000000000001';
const URL_DETALHE = `/empresa/cargas/detalhe?id=${CARGA_URGENTE_ID}`;
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function abrirTela(page: Page) {
  await entrarComoPerfil(page, 'empresa');
  await page.goto(URL_DETALHE);
  await expect(page.getByRole('heading', { level: 2, name: 'Propostas (5)' })).toBeVisible();
}

async function abrirConversaDoJoao(page: Page) {
  const abrir = page.getByRole('button', { name: 'Abrir conversa com João da Silva' });
  await abrir.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 4, name: 'Conversa com João da Silva' }),
  ).toBeVisible();
  await expect(page.getByText('Combinado, portão 2.')).toBeVisible();
}

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`);
}

test.describe('abrir e fechar com o teclado', () => {
  soNoDesktop();
  test('Enter abre a conversa, o foco vai ao título e o histórico aparece com autor e hora', async ({
    page,
  }) => {
    await abrirTela(page);
    await expect(page.getByRole('button', { name: /^Abrir conversa com / })).toHaveCount(5);
    await abrirConversaDoJoao(page);

    const aberto = page.getByRole('button', { name: 'Fechar conversa com João da Silva' });
    await expect(aberto).toHaveAttribute('aria-expanded', 'true');
    await expect(aberto).toHaveAttribute('aria-controls', /^conversa-/);
    await expect(
      page.getByRole('heading', { level: 4, name: 'Conversa com João da Silva' }),
    ).toBeFocused();

    const historico = page.getByRole('region', { name: 'Mensagens da conversa com João da Silva' });
    await expect(historico.getByText('Você', { exact: true })).toHaveCount(2);
    await expect(historico.getByText('João da Silva', { exact: true })).toHaveCount(1);
    await expect(historico.getByRole('listitem')).toHaveCount(3);
    // O chat não é uma região viva: o anúncio das mensagens novas é da região viva global.
    await expect(page.locator('[role="log"]')).toHaveCount(0);
  });

  test('abrir outra conversa fecha a anterior, e o botão fecha a conversa', async ({ page }) => {
    await abrirTela(page);
    await abrirConversaDoJoao(page);

    await page.getByRole('button', { name: 'Abrir conversa com Maria Souza' }).click();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(1);
    await expect(
      page.getByRole('heading', { level: 4, name: 'Conversa com Maria Souza' }),
    ).toBeVisible();

    const fechar = page.getByRole('button', { name: 'Fechar conversa com Maria Souza' });
    await fechar.click();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Abrir conversa com Maria Souza' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('enviar com o teclado', () => {
  soNoDesktop();
  test('Tab leva ao campo e ao botão, Enter envia e o campo é limpo', async ({ page }) => {
    await abrirTela(page);
    await abrirConversaDoJoao(page);

    // Do título, o Tab passa pelo histórico rolável (alcançável pelo teclado) e chega ao campo.
    const campo = page.getByLabel('Mensagem', { exact: true });
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('region', { name: 'Mensagens da conversa com João da Silva' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(campo).toBeFocused();
    await page.keyboard.type('Chego às 14h no portão 2');
    await expect(page.getByText('24 de 1000 caracteres')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(campo).toHaveValue('');
    await expect(campo).toBeFocused();
  });

  test('telefone, e-mail ou link é barrado com erro ligado ao campo e o texto continua lá', async ({
    page,
  }) => {
    await abrirTela(page);
    await abrirConversaDoJoao(page);

    const campo = page.getByLabel('Mensagem', { exact: true });
    await campo.fill('Me chama no 34 99999-8888');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();

    const erro = page.getByText('Não envie telefone, e-mail ou link. Combine tudo por aqui.');
    await expect(erro).toBeVisible();
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(campo).toHaveAttribute('aria-describedby', /erro/);
    await expect(campo).toHaveValue('Me chama no 34 99999-8888');
    await expect(campo).toBeFocused();
  });
});

test.describe('conversa encerrada', () => {
  soNoDesktop();
  test('proposta recusada: histórico legível, envio desligado e o motivo em texto', async ({
    page,
  }) => {
    await abrirTela(page);
    await page.getByRole('button', { name: 'Abrir conversa com Carlos Lima' }).click();

    await expect(
      page.getByText('Obrigado pela proposta, mas fechamos com outro motorista.'),
    ).toBeVisible();
    await expect(
      page.getByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
    ).toBeVisible();
    await expect(page.getByLabel('Mensagem', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled();
  });
});

// Axe com a conversa aberta, com o erro no campo e encerrada: tema claro e escuro, 1280 px e 320 px
// (os dois projetos rodam estes testes).
for (const esquema of ['light', 'dark'] as const) {
  test.describe(`acessibilidade, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });

    test('axe sem violações com a conversa aberta', async ({ page }) => {
      await abrirTela(page);
      await abrirConversaDoJoao(page);
      expect(await violacoes(page)).toEqual([]);
    });

    test('axe sem violações com o erro no campo', async ({ page }) => {
      await abrirTela(page);
      await abrirConversaDoJoao(page);
      await page.getByLabel('Mensagem', { exact: true }).fill('joao arroba gmail');
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await expect(page.getByText(/Não envie telefone, e-mail ou link/)).toBeVisible();
      expect(await violacoes(page)).toEqual([]);
    });

    test('axe sem violações com a conversa encerrada', async ({ page }) => {
      await abrirTela(page);
      await page.getByRole('button', { name: 'Abrir conversa com Carlos Lima' }).click();
      await expect(
        page.getByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
      ).toBeVisible();
      expect(await violacoes(page)).toEqual([]);
    });
  });
}

// WCAG 1.4.10: mensagem longa sem espaços (300 letras passam no filtro de contato) não pode estourar
// o balão nem criar rolagem horizontal em 320 px. O mock do E2E é sem estado: o histórico é
// acrescido da mensagem longa na resposta do próprio mock (`page.route` + `route.fetch`), que
// mantém os cabeçalhos de CORS do mock.
test.describe('reflow em 320 px', () => {
  const LARGURA_ESTREITA = 320;
  const EMPRESA_ID = '11111111-1111-4111-8111-111111111111';
  const JOAO_ID = '22222222-2222-4222-8222-222222222222';
  const LONGO = 'k'.repeat(300);

  test.beforeEach(({ page }, info) => {
    test.skip(info.project.name !== 'estreito', 'só vale na largura de 320 px');
    return page.route('**/propostas/*/mensagens', async (rota) => {
      if (rota.request().method() !== 'GET') return rota.continue();
      const resposta = await rota.fetch();
      const corpo = (await resposta.json()) as { mensagens: unknown[] };
      corpo.mensagens.push(
        {
          id: 'eeeeeeee-0000-4000-8000-0000000009a1',
          remetente_id: JOAO_ID,
          texto: LONGO,
          criado_em: '2026-11-04T17:20:00.000Z',
        },
        {
          id: 'eeeeeeee-0000-4000-8000-0000000009a2',
          remetente_id: EMPRESA_ID,
          texto: LONGO,
          criado_em: '2026-11-04T17:21:00.000Z',
        },
      );
      return rota.fulfill({ response: resposta, json: corpo });
    });
  });

  test('mensagem longa sem espaços quebra dentro do balão e da região, sem rolagem horizontal', async ({
    page,
  }) => {
    await abrirTela(page);
    await abrirConversaDoJoao(page);

    const regiao = page.getByRole('region', { name: 'Mensagens da conversa com João da Silva' });
    await expect(regiao.getByText(LONGO)).toHaveCount(2);

    const regiaoSemRolagem = await regiao.evaluate((no) => no.scrollWidth <= no.clientWidth);
    expect(regiaoSemRolagem).toBe(true);

    const baloes = await regiao.getByText(LONGO).evaluateAll((nos) =>
      nos.map((texto) => {
        const balao = texto.parentElement as HTMLElement;
        const caixa = (texto.closest('[role="region"]') as HTMLElement).getBoundingClientRect();
        const lado = balao.getBoundingClientRect();
        return {
          textoCabe: texto.scrollWidth <= texto.clientWidth,
          balaoCabe: balao.scrollWidth <= balao.clientWidth,
          dentroDaRegiao: lado.left >= caixa.left - 1 && lado.right <= caixa.right + 1,
        };
      }),
    );
    expect(baloes).toEqual([
      { textoCabe: true, balaoCabe: true, dentroDaRegiao: true },
      { textoCabe: true, balaoCabe: true, dentroDaRegiao: true },
    ]);

    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(LARGURA_ESTREITA);
  });
});
