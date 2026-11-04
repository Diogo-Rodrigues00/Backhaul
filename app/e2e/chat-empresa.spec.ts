import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { entrarComoPerfil, expect, test } from './fixtures';

// Card 042 (ADR 0016): chat da proposta em "Propostas da carga", empresa, no HTML exportado e no mock
// da API (sem estado: o POST responde 201 e a lista de mensagens volta igual). A conversa entre duas
// janelas fica no card 046. Cobertura única, no desktop.
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

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

test.describe('acessibilidade', () => {
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
