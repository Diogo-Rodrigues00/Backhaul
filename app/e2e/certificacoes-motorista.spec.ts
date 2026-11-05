import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 031: motorista envia e reenvia certificações (MVP-19). A API é o mock em localhost:4010, sem
// estado para este token (`mock-motorista`): a lista traz uma certificação de cada situação e o POST
// responde 201 sem gravar. Tudo aqui é feito pelo teclado.
const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const NOME_MOPP_8 = 'MOPP - Classe 8 Corrosivos';

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'motorista');
  await page.goto('/motorista/certificacoes');
  await expect(h1(page)).toHaveText('Minhas certificações');
  // A lista e o formulário chegam depois da hidratação.
  await expect(page.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible();
}

/** Amanhã no relógio do navegador (o mesmo do teste), em dia, mês e ano. */
function amanha() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return {
    dia: String(data.getDate()),
    mes: String(data.getMonth() + 1),
    ano: String(data.getFullYear()),
    iso: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`,
  };
}

test.describe('minhas certificações', () => {
  test('lista as três situações em texto e só pendente e vencida têm "Reenviar"', async ({
    page,
  }) => {
    await abrir(page);

    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      'MOPP - Classe 3 Inflamáveis',
      NOME_MOPP_8,
      'Transporte de Cargas Indivisíveis',
    ]);
    await expect(page.getByText('Aprovada', { exact: true })).toBeVisible();
    await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible();
    await expect(page.getByText('Vencida', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reenviar Transporte de Cargas Indivisíveis' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reenviar MOPP - Classe 3 Inflamáveis' }),
    ).toHaveCount(0);
    // O grupo da validade tem nome e três campos rotulados.
    const grupo = page.getByRole('group', { name: 'Validade' });
    await expect(grupo.getByLabel('Dia', { exact: true })).toBeVisible();
    await expect(grupo.getByLabel('Mês', { exact: true })).toBeVisible();
    await expect(grupo.getByLabel('Ano', { exact: true })).toBeVisible();
  });

  test('cadastro só pelo teclado: escolhe, digita número e data e envia com Enter', async ({
    page,
  }) => {
    await abrir(page);
    const validade = amanha();

    await page.getByLabel('Certificação', { exact: true }).focus();
    // A primeira opção é "Escolha a certificação"; a seguinte (aprovada) está desabilitada e é pulada.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByLabel('Certificação', { exact: true })).toHaveValue(/.+/);
    await page.keyboard.press('Tab');
    await page.keyboard.type('MOPP-8-999');
    await page.keyboard.press('Tab');
    await page.keyboard.type(validade.dia);
    await page.keyboard.press('Tab');
    await page.keyboard.type(validade.mes);
    await page.keyboard.press('Tab');
    await page.keyboard.type(validade.ano);

    const envio = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().endsWith('/certificacoes/minhas'),
    );
    await page.keyboard.press('Enter');

    const corpo = (await envio).postDataJSON() as Record<string, unknown>;
    expect(corpo.numero_certificado).toBe('MOPP-8-999');
    expect(corpo.validade).toBe(validade.iso);
    expect(Object.keys(corpo).sort()).toEqual([
      'certificacao_id',
      'numero_certificado',
      'validade',
    ]);
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'Certificação enviada. Aguardando aprovação.',
    );
    await expect(
      page.getByRole('main').getByText('Certificação enviada. Aguardando aprovação.'),
    ).toBeVisible();
  });

  test('"Reenviar" abre o formulário com os dados, mostra o aviso e leva o foco ao título', async ({
    page,
  }) => {
    await abrir(page);

    await page.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` }).focus();
    await page.keyboard.press('Enter');

    const titulo = page.getByRole('heading', { level: 2, name: 'Reenviar certificação' });
    await expect(titulo).toBeFocused();
    await expect(page.getByLabel('Número do certificado', { exact: true })).toHaveValue('654321');
    await expect(
      page.getByText('Ao reenviar, a certificação volta para Aguardando aprovação.'),
    ).toBeVisible();
    await expect(page.getByLabel('Certificação', { exact: true })).toHaveValue(/.+/);
  });

  test('envio vazio: resumo de erros recebe o foco, erro único no grupo Validade e nada é enviado', async ({
    page,
  }) => {
    const envios: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/certificacoes/minhas')) {
        envios.push(req.url());
      }
    });
    await abrir(page);
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();

    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Corrija 3 campos para continuar.');
    await expect(alerta).toBeFocused();
    expect(envios).toEqual([]);

    // O erro da data é um só e está ligado ao grupo e às três partes.
    const grupo = page.getByRole('group', { name: 'Validade' });
    await expect(grupo).toHaveAttribute('aria-describedby', /-erro/);
    await expect(grupo.getByText('Informe uma data válida', { exact: false })).toHaveCount(1);
    for (const nome of ['Dia', 'Mês', 'Ano']) {
      await expect(grupo.getByLabel(nome, { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(grupo.getByLabel(nome, { exact: true })).toHaveAttribute(
        'aria-describedby',
        /-erro$/,
      );
    }
  });

  test('data que não existe e data no passado são recusadas antes de enviar', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Número do certificado', { exact: true }).fill('1');
    await page.getByLabel('Dia', { exact: true }).fill('31');
    await page.getByLabel('Mês', { exact: true }).fill('2');
    await page.getByLabel('Ano', { exact: true }).fill(String(new Date().getFullYear() + 2));
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(page.getByText('Informe uma data válida', { exact: false }).first()).toBeVisible();

    await page.getByLabel('Dia', { exact: true }).fill('1');
    await page.getByLabel('Mês', { exact: true }).fill('1');
    await page.getByLabel('Ano', { exact: true }).fill('2020');
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(
      page.getByText('A validade não pode estar no passado', { exact: false }).first(),
    ).toBeVisible();
  });

  test('axe sem violações com o formulário em erro (tema claro; 1280 e 320 px)', async ({
    page,
  }) => {
    await abrir(page);
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Corrija 3 campos');

    const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`)).toEqual(
      [],
    );
  });

  test.describe('tema escuro', () => {
    test.use({ colorScheme: 'dark' });

    test('axe sem violações com o formulário em erro', async ({ page }) => {
      await abrir(page);
      await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
      await expect(page.getByRole('alert').first()).toContainText('Corrija 3 campos');

      const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nó(s))`),
      ).toEqual([]);
    });
  });
});
