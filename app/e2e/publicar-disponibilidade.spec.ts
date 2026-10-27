import { entrarComoPerfil, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// Card 023: motorista publica disponibilidade (MVP-10, D-PO-03). A API é o mock em localhost:4010.
// "Cargas próximas" é do card 024: aqui confere-se o redirecionamento e a ativa guardada no aparelho.
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

async function abrir(page: Page) {
  await entrarComoPerfil(page, 'motorista');
  await page.goto('/motorista/disponibilidades/nova');
  await expect(h1(page)).toHaveText('Publicar disponibilidade');
}

async function escolherCidade(page: Page, busca: string, nome: string) {
  await page.getByRole('combobox', { name: 'Ou escolha a cidade' }).fill(busca);
  await page.getByRole('option', { name: nome }).click();
}

test.describe('publicar disponibilidade', () => {
  test('tem o seletor com GPS, o raio, os grupos nomeados e os padrões', async ({ page }) => {
    await abrir(page);

    await expect(page.getByRole('button', { name: 'Usar minha localização' })).toBeVisible();
    await expect(page.getByLabel('Raio de busca (km)')).toHaveValue('50');
    await expect(page.getByRole('radiogroup', { name: 'Urgência' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Prazo' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Em 24 horas' })).toBeChecked();
  });

  test('publica escolhendo a cidade, envia números e abre "Cargas próximas"', async ({ page }) => {
    await abrir(page);
    await escolherCidade(page, 'uberl', 'Uberlândia - MG');
    await page.getByLabel('Raio de busca (km)').fill('80');
    await page.getByRole('radio', { name: 'Urgente' }).click();
    const envio = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().endsWith('/disponibilidades'),
    );
    await page.getByRole('button', { name: 'Publicar disponibilidade' }).click();

    const corpo = (await envio).postDataJSON() as Record<string, unknown>;
    const local = corpo.local as Record<string, unknown>;
    expect(typeof local.lat).toBe('number');
    expect(typeof local.lng).toBe('number');
    expect(corpo.raio_busca_km).toBe(80);
    expect(corpo.urgencia).toBe('urgente');
    expect(new Date(String(corpo.expira_em)).getTime()).toBeGreaterThan(Date.now());
    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'Disponibilidade publicada',
    );
    // A nova fica guardada no aparelho como a ativa (D-PO-03).
    const guardada = await page.evaluate(() =>
      window.localStorage.getItem('backhaul.disponibilidadeAtiva'),
    );
    expect(guardada).toContain('"publicada"');
  });

  test('sem local: resumo com o foco, erro no campo e nenhuma chamada à API', async ({ page }) => {
    const envios: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/disponibilidades')) {
        envios.push(req.url());
      }
    });
    await abrir(page);
    await page.getByRole('button', { name: 'Publicar disponibilidade' }).click();

    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Corrija 1 campo para continuar.');
    await expect(alerta).toBeFocused();
    expect(envios).toEqual([]);
  });

  test('raio acima de 500 é recusado antes de enviar', async ({ page }) => {
    await abrir(page);
    await escolherCidade(page, 'uberl', 'Uberlândia - MG');
    await page.getByLabel('Raio de busca (km)').fill('501');
    await page.getByRole('button', { name: 'Publicar disponibilidade' }).click();

    await expect(
      page.getByText('Informe um número maior que zero e até 500.').first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/motorista\/disponibilidades\/nova$/);
  });
});
