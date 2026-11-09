import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 026 (MVP-15): "Minhas propostas" do motorista no navegador, com a API de mock (localhost:4010).
// O mock devolve 8 propostas (mocks/fixtures/propostas.ts, minhasPropostasMock). Roda nos projetos
// "desktop" (1280 px, navegação no cabeçalho) e "estreito" (320 px, barra inferior com o "Mais").
// A regra de axe (WCAG 2.2 AA) é a mesma de e2e/a11y.spec.ts.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('minhas propostas do motorista', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/propostas');
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
  });

  test('lista as 8 propostas e cada uma tem empresa, status em texto e valores', async ({
    page,
  }) => {
    const lista = page.getByRole('list', { name: 'Propostas' });
    await expect(lista.getByRole('article')).toHaveCount(8);
    await expect(page.getByText('Empresa: Transportes Rápidos LTDA').first()).toBeVisible();
    await expect(page.getByText('Pendente').first()).toBeVisible();
    await expect(page.getByText('Recusada').first()).toBeVisible();
    await expect(page.getByText('Valor oferecido pela empresa').first()).toBeVisible();
  });

  test('proposta aceita com frete tem "Ver frete" que leva a Meus fretes', async ({ page }) => {
    const link = page.getByRole('link', { name: /Ver frete de/ }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/motorista/fretes');
  });

  test('o botão de atualizar e a legenda de atualização automática aparecem', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible();
    await expect(page.getByText(/Esta tela atualiza sozinha a cada 10 s/)).toBeVisible();
  });

  test('desktop: "Minhas propostas" e "Disponibilidade" estão no menu do cabeçalho', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'cabeçalho só acima de 960 px');
    const cabecalho = page.getByRole('navigation', { name: 'Principal' }).first();
    await expect(cabecalho.getByRole('link', { name: 'Minhas propostas' })).toBeVisible();
    await expect(cabecalho.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mais' })).toHaveCount(0);
  });

  test('celular: "Mais" abre por teclado, Esc fecha e devolve o foco ao botão', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
    const mais = page.getByRole('button', { name: 'Mais' });
    const disponibilidade = page.getByRole('link', { name: 'Disponibilidade' });
    await expect(disponibilidade).toBeHidden();

    await mais.focus();
    await expect(mais).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(mais).toHaveAttribute('aria-expanded', 'true');
    await expect(disponibilidade).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(disponibilidade).toBeHidden();
    await expect(mais).toBeFocused();
    await expect(mais).toHaveAttribute('aria-expanded', 'false');
  });
});

// Navegação de verdade pelo teclado: começa numa tela que não é Minhas propostas e chega até ela (ou até
// Disponibilidade) só com Tab e Enter.
test.describe('navegação por teclado até a tela', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('desktop: foco no link "Minhas propostas" do menu, Enter abre a tela', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'cabeçalho só acima de 960 px');
    const link = page
      .getByRole('navigation', { name: 'Principal' })
      .first()
      .getByRole('link', { name: 'Minhas propostas' });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/motorista\/propostas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
  });

  test('celular: "Mais" por teclado, Tab até "Disponibilidade", Enter abre a tela', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
    const mais = page.getByRole('button', { name: 'Mais' });
    await mais.focus();
    await page.keyboard.press('Enter');
    await expect(mais).toHaveAttribute('aria-expanded', 'true');

    const disponibilidade = page.getByRole('link', { name: 'Disponibilidade' });
    await page.keyboard.press('Tab');
    await expect(disponibilidade).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/motorista\/disponibilidades$/);
  });

  test('celular: Tab para fora do painel fecha o "Mais" (o painel não cobre o que tem foco)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
    const mais = page.getByRole('button', { name: 'Mais' });
    const disponibilidade = page.getByRole('link', { name: 'Disponibilidade' });
    await mais.focus();
    await page.keyboard.press('Enter');
    await expect(mais).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Tab');
    await expect(disponibilidade).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(mais).toHaveAttribute('aria-expanded', 'false');
    await expect(disponibilidade).toBeHidden();
  });
});

// Axe com o "Mais" aberto, no celular, nos dois temas (o painel é o que a tela ganha ao abrir).
test.describe('axe com o "Mais" da barra aberto (320 px)', () => {
  for (const esquema of ['light', 'dark'] as const) {
    test.describe(`tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
      test.use({ colorScheme: esquema });

      test('sem violações com o painel aberto', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'estreito', 'barra inferior só até 960 px');
        await entrarComoPerfil(page, 'motorista');
        await page.goto('/motorista/propostas');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        await page.getByRole('button', { name: 'Mais' }).click();
        await expect(page.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();

        const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
        expect(
          resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`),
        ).toEqual([]);
      });
    });
  }
});

// Card 043 (ADR 0016): chat da proposta em "Minhas propostas", no mock da API (sem estado: o POST
// responde 201 e a lista de mensagens volta igual). A 1ª e a 3ª proposta dividem empresa e carga, então
// o botão da pendente é o primeiro com o nome. O comportamento roda no desktop; o axe roda nos dois projetos.
const PENDENTE = 'Abrir conversa com Transportes Rápidos LTDA sobre Produtos inflamáveis';
const RECUSADA = 'Abrir conversa com Agro Cerrado Grãos S.A. sobre Grãos a granel';
const TITULO_CONVERSA = 'Conversa com Transportes Rápidos LTDA';
const ENCERRADA = 'Esta proposta foi encerrada. Você ainda pode ler a conversa.';

async function abrirMinhasPropostas(page: Page) {
  await entrarComoPerfil(page, 'motorista');
  await page.goto('/motorista/propostas');
  await expect(page.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
}

async function abrirConversaPendente(page: Page) {
  await page.getByRole('button', { name: PENDENTE }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 4, name: TITULO_CONVERSA })).toBeVisible();
  await expect(page.getByText('Combinado, portão 2.')).toBeVisible();
}

test.describe('chat da proposta do motorista', () => {
  // eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
  });

  test('Enter abre a conversa, o foco vai ao título e o histórico tem autor e hora', async ({
    page,
  }) => {
    await abrirMinhasPropostas(page);
    await expect(page.getByRole('button', { name: /^Abrir conversa com / })).toHaveCount(8);
    await abrirConversaPendente(page);

    const aberto = page.getByRole('button', {
      name: 'Fechar conversa com Transportes Rápidos LTDA sobre Produtos inflamáveis',
    });
    await expect(aberto).toHaveAttribute('aria-expanded', 'true');
    await expect(aberto).toHaveAttribute('aria-controls', /^conversa-/);
    await expect(page.getByRole('heading', { level: 4, name: TITULO_CONVERSA })).toBeFocused();

    const historico = page.getByRole('region', {
      name: 'Mensagens da conversa com Transportes Rápidos LTDA',
    });
    await expect(historico.getByText('Você', { exact: true })).toHaveCount(1);
    await expect(historico.getByRole('listitem')).toHaveCount(3);
    await expect(page.locator('[role="log"]')).toHaveCount(0);
  });

  test('abrir outra conversa fecha a anterior', async ({ page }) => {
    await abrirMinhasPropostas(page);
    await abrirConversaPendente(page);

    await page.getByRole('button', { name: RECUSADA }).click();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(1);
    await expect(
      page.getByRole('heading', { level: 4, name: 'Conversa com Agro Cerrado Grãos S.A.' }),
    ).toBeVisible();
  });

  test('Tab leva ao campo e ao botão, Enter envia e o campo é limpo', async ({ page }) => {
    await abrirMinhasPropostas(page);
    await abrirConversaPendente(page);

    const campo = page.getByLabel('Mensagem', { exact: true });
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('region', { name: 'Mensagens da conversa com Transportes Rápidos LTDA' }),
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

  test('proposta recusada: histórico legível, envio desligado e o motivo em texto', async ({
    page,
  }) => {
    await abrirMinhasPropostas(page);
    await page.getByRole('button', { name: RECUSADA }).click();

    await expect(
      page.getByText('Agradecemos o interesse, mas a carga seguiu com outro motorista.'),
    ).toBeVisible();
    await expect(page.getByText(ENCERRADA)).toBeVisible();
    await expect(page.getByLabel('Mensagem', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled();
  });
});

// Axe com a conversa aberta (aberta, com erro no campo e encerrada): claro e escuro, 1280 px e 320 px.
for (const esquema of ['light', 'dark'] as const) {
  test.describe(`axe do chat, tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });

    async function violacoes(page: Page) {
      const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
      return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`);
    }

    test('sem violações com a conversa aberta', async ({ page }) => {
      await abrirMinhasPropostas(page);
      await abrirConversaPendente(page);
      expect(await violacoes(page)).toEqual([]);
    });

    test('sem violações com o erro no campo', async ({ page }) => {
      await abrirMinhasPropostas(page);
      await abrirConversaPendente(page);
      await page.getByLabel('Mensagem', { exact: true }).fill('joao arroba gmail');
      await page.getByRole('button', { name: 'Enviar', exact: true }).click();
      await expect(page.getByText(/Não envie telefone, e-mail ou link/)).toBeVisible();
      expect(await violacoes(page)).toEqual([]);
    });

    test('sem violações com a conversa encerrada', async ({ page }) => {
      await abrirMinhasPropostas(page);
      await page.getByRole('button', { name: RECUSADA }).click();
      await expect(page.getByText(ENCERRADA)).toBeVisible();
      expect(await violacoes(page)).toEqual([]);
    });
  });
}
