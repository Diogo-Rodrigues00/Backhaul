import { CHAVE_TOKEN, entrarComoPerfil, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// Card 015: login e roteamento por perfil (MVP-03), aviso de sessão (CT-04) e foco após redirecionar.
// A API é o mock em localhost:4010: qualquer senha com 8 ou mais caracteres entra.
const SENHA = 'senha-valida-123';
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
// O aviso de sessão é o `status` dentro do `main` (a região viva global, fora dele, repete o texto).
const avisoDeSessao = (page: Page) =>
  page.getByRole('main').getByRole('status').filter({ hasText: 'Sua sessão expirou.' });
const campoSenha = (page: Page) => page.getByLabel('Senha', { exact: true });

async function preencher(page: Page, email: string, senha: string) {
  await page.getByLabel('E-mail').fill(email);
  await campoSenha(page).fill(senha);
}

test.describe('entrar', () => {
  test('empresa chega a "Minhas cargas" e o cabeçalho mostra o nome de GET /eu', async ({
    page,
  }, info) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await preencher(page, 'empresa@mock.test', SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/empresa\/cargas$/);
    await expect(h1(page)).toHaveText('Minhas cargas');
    // O nome só cabe no cabeçalho acima de 1240 px.
    if (info.project.name === 'desktop') {
      await expect(page.getByRole('banner').getByText('Transportes Rápidos LTDA')).toBeVisible();
    }
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_TOKEN)).toBe('mock-empresa');
  });

  test('Enter no campo de senha envia o formulário', async ({ page }) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await preencher(page, 'motorista@mock.test', SENHA);
    await campoSenha(page).press('Enter');

    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(h1(page)).toHaveText('Cargas próximas');
  });

  test('administrador chega à tela sem telas, com "Sair"', async ({ page }) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await preencher(page, 'admin@mock.test', SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(h1(page)).toHaveText('Perfil de administrador sem telas nesta versão');
    await expect(page.getByRole('button', { name: 'Sair' }).first()).toBeVisible();
  });

  test('e-mail desconhecido: "E-mail ou senha inválidos" no formulário, foco na mensagem', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await preencher(page, 'ninguem@mock.test', SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();

    const alerta = page.getByRole('alert');
    await expect(alerta).toContainText('E-mail ou senha inválidos');
    await expect(alerta).toBeFocused();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByLabel('E-mail')).toHaveValue('ninguem@mock.test');
  });

  test('campos vazios: erro junto de cada campo e nenhuma chamada à API', async ({ page }) => {
    const logins: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/login')) logins.push(req.url());
    });
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Corrija 2 campos para continuar.');
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
    await expect(campoSenha(page)).toHaveAttribute('aria-invalid', 'true');
    expect(logins).toEqual([]);
  });

  test('mostrar senha é um botão com aria-pressed que revela o texto digitado', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    const campo = campoSenha(page);
    await campo.fill('abc12345');
    await expect(campo).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(campo).not.toHaveAttribute('type', 'password');
  });

  test('"Criar conta" é um link para /cadastro', async ({ page }) => {
    await page.goto('/entrar');
    await expect(h1(page)).toHaveText('Entrar');
    await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
      'href',
      '/cadastro',
    );
  });
});

test.describe('aviso e redirecionamento', () => {
  test('?aviso=sessao-expirada mostra o aviso como status', async ({ page }) => {
    await page.goto('/entrar?aviso=sessao-expirada');
    const aviso = avisoDeSessao(page);
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Entre de novo.');
    await expect(page.getByRole('alert')).toHaveCount(0);
    // E a região viva global também recebeu o texto, para o leitor de tela anunciar.
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'Sua sessão expirou.',
    );
  });

  test('anônimo que abre uma área protegida cai no login com o foco no h1', async ({ page }) => {
    await page.goto('/empresa/cargas');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(h1(page)).toHaveText('Entrar');
    await expect(h1(page)).toBeFocused();
  });

  test('token vencido: login com o aviso e o foco no h1', async ({ page }) => {
    await page.addInitScript((chave) => localStorage.setItem(chave, 'token-vencido'), CHAVE_TOKEN);
    await page.goto('/motorista/cargas');
    await expect(page).toHaveURL(/\/entrar\?aviso=sessao-expirada$/);
    await expect(avisoDeSessao(page)).toBeVisible();
    await expect(h1(page)).toBeFocused();
  });

  test('já autenticado, abrir /entrar leva à área do perfil', async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/entrar');
    await expect(page).toHaveURL(/\/empresa\/cargas$/);
  });
});
