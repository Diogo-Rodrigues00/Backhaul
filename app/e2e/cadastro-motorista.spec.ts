import { expect, test } from './fixtures';

// Card 017 (MVP-06): caminho feliz do cadastro de motorista contra o mock da API (porta 4010).
// Cada execução usa um e-mail e um CPF novos: o mock recusa repetidos com 409.
const cpfUnico = () => String(Date.now()).slice(-11).padStart(11, '0');

test.describe('cadastro de motorista', () => {
  test('Enter avança de campo e, no último, envia; 201 abre Cargas próximas', async ({ page }) => {
    const email = `motorista.${Date.now()}@mock.test`;
    await page.goto('/cadastro/motorista');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cadastro de motorista');

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email);
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).press('Enter');
    await expect(page.getByRole('textbox', { name: 'Senha', exact: true })).toBeFocused();

    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('senhaSegura8');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Nome completo', exact: true })).toBeFocused();

    await page.getByRole('textbox', { name: 'Nome completo', exact: true }).fill('João da Silva');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'CPF', exact: true }).fill(cpfUnico());
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'CNH', exact: true }).fill('11122233344');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Tipo de veículo', exact: true }).fill('Carreta');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Placa', exact: true }).fill('ABC1D23');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Capacidade em kg', exact: true }).fill('15000');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cargas próximas');
  });
});
