import { entrarComoPerfil, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// Card 019: empresa publica carga (MVP-08). A API é o mock em localhost:4010.
// A lista "Minhas cargas" é do card 020: aqui confere-se o redirecionamento depois do 201.
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

async function escolherCidade(
  page: Page,
  campo: 'Origem' | 'Destino',
  busca: string,
  nome: string,
) {
  await page.getByRole('combobox', { name: campo }).fill(busca);
  await page.getByRole('option', { name: nome }).click();
}

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'empresa');
  await page.goto('/empresa/cargas/nova');
  await expect(h1(page)).toHaveText('Publicar carga');
}

async function preencher(page: Page) {
  await page.getByLabel('Tipo de carga').fill('Produtos inflamáveis');
  await escolherCidade(page, 'Origem', 'uberl', 'Uberlândia - MG');
  await escolherCidade(page, 'Destino', 'ubera', 'Uberaba - MG');
  await page.getByLabel('Peso (kg)').fill('8000');
  await page.getByLabel('Valor oferecido (R$)').fill('3500,00');
}

test.describe('publicar carga', () => {
  test('tem os grupos nomeados, os padrões e o seletor de certificação rotulado', async ({
    page,
  }) => {
    await abrir(page);

    await expect(page.getByRole('radiogroup', { name: 'Urgência' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Prazo' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Em 24 horas' })).toBeChecked();
    const certificacao = page.getByLabel('Certificação exigida (opcional)');
    await expect(certificacao).toHaveValue('');
    await expect(certificacao.locator('option').first()).toHaveText('Nenhuma');
    // As certificações da API entram depois de "Nenhuma".
    await expect(certificacao.locator('option')).not.toHaveCount(1);
  });

  test('publica, envia o corpo certo e volta a "Minhas cargas"', async ({ page }) => {
    await abrir(page);
    await preencher(page);
    await page.getByRole('radio', { name: 'Urgente' }).click();
    const envio = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().endsWith('/cargas'),
    );
    await page.getByRole('button', { name: 'Publicar carga' }).click();

    const corpo = (await envio).postDataJSON() as Record<string, unknown>;
    expect(corpo.peso_kg).toBe(8000);
    expect(corpo.valor_oferecido).toBe(3500);
    expect(corpo.urgencia).toBe('urgente');
    expect(corpo.certificacao_requerida_id).toBeNull();
    expect(new Date(String(corpo.expira_em)).getTime()).toBeGreaterThan(Date.now());
    await expect(page).toHaveURL(/\/empresa\/cargas$/);
    await expect(h1(page)).toHaveText('Minhas cargas');
    // Pode haver outro `status` na tela (o "Carregando cargas…" enquanto o corpo da lista abre).
    await expect(
      page.locator('[role="status"][aria-live="polite"]').filter({ hasText: 'Carga publicada' }),
    ).toBeVisible();
  });

  test('campos vazios: resumo com o foco, erro em cada campo e nenhuma chamada à API', async ({
    page,
  }) => {
    const envios: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/cargas')) envios.push(req.url());
    });
    await abrir(page);
    await page.getByRole('button', { name: 'Publicar carga' }).click();

    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Corrija 5 campos para continuar.');
    await expect(alerta).toBeFocused();
    await expect(page.getByLabel('Tipo de carga')).toHaveAttribute('aria-invalid', 'true');
    expect(envios).toEqual([]);
  });

  test('origem igual ao destino avisa antes de enviar', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Tipo de carga').fill('Grãos');
    await escolherCidade(page, 'Origem', 'uberl', 'Uberlândia - MG');
    await escolherCidade(page, 'Destino', 'uberl', 'Uberlândia - MG');
    await page.getByLabel('Peso (kg)').fill('100');
    await page.getByLabel('Valor oferecido (R$)').fill('500');
    await page.getByRole('button', { name: 'Publicar carga' }).click();

    await expect(page.getByText('Origem e destino precisam ser diferentes').first()).toBeVisible();
    await expect(page).toHaveURL(/\/empresa\/cargas\/nova$/);
  });

  test('a prévia mostra o que foi digitado (desktop)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'A prévia só aparece acima de 960 px.');
    await abrir(page);
    await preencher(page);

    const previa = page.getByRole('group', { name: 'Prévia da carga' });
    await expect(previa).toContainText('Produtos inflamáveis');
    await expect(previa).toContainText('Uberlândia - MG');
    await expect(previa).toContainText('Uberaba - MG');
  });
});
