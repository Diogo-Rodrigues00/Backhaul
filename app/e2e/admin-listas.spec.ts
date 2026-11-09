import { entrarComoPerfil, expect, test } from './fixtures';

// Card 041: fretes e usuários do admin no navegador, com a API de mock (localhost:4010).
// O axe nas 2 larguras e 2 temas roda em a11y.spec.ts, que lê `/admin/fretes` e `/admin/usuarios`
// de e2e/rotas.ts.
const SEM_ESPACOS = 'k'.repeat(120);

test.describe('admin: fretes e usuários', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoPerfil(page, 'admin');
  });

  test('Resumo → Fretes → Usuários pelo menu, só com o teclado', async ({ page }, info) => {
    test.skip(
      info.project.name === 'estreito',
      'a navegação do cabeçalho só aparece na largura larga',
    );
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Resumo da plataforma' }),
    ).toBeVisible();

    const navegacao = page.getByRole('navigation', { name: 'Principal' });
    for (const [rotulo, titulo] of [
      ['Fretes', 'Fretes da plataforma'],
      ['Usuários', 'Usuários da plataforma'],
    ] as const) {
      const link = navegacao.getByRole('link', { name: rotulo });
      let achou = false;
      for (let i = 0; i < 30 && !achou; i += 1) {
        await page.keyboard.press('Tab');
        achou = await link.evaluate((el) => el === document.activeElement);
      }
      expect(achou).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await expect(navegacao.getByRole('link', { name: rotulo })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  test('fretes: cartões na ordem da API, com "Não pago" e "Ainda não calculada" em texto', async ({
    page,
  }) => {
    await page.goto('/admin/fretes');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fretes da plataforma' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Fretes mais recentes' }),
    ).toBeVisible();

    const titulos = page.getByRole('heading', { level: 3 });
    await expect(titulos).toHaveText(['Grãos', 'Produtos inflamáveis', 'Material de construção']);
    await expect(page.locator('main dd', { hasText: /^Não pago$/ })).toHaveCount(1);
    await expect(page.locator('main dd', { hasText: /^Ainda não calculada$/ })).toHaveCount(1);
    await expect(page.locator('main dd', { hasText: /^R\$\s175,00$/ })).toHaveCount(1);
    await expect(page.getByText('Mostrando os 100 mais recentes.')).toHaveCount(0);
  });

  test('usuários: nome ou e-mail no título, perfil e situação em texto, sem documentos', async ({
    page,
  }) => {
    await page.goto('/admin/usuarios');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Usuários da plataforma' }),
    ).toBeVisible();

    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      'admin@mock.test',
      'Transportes Rápidos LTDA',
      'João da Silva',
      'Maria Souza',
    ]);
    await expect(page.locator('main dd', { hasText: /^Inativo$/ })).toHaveCount(1);
    await expect(page.locator('main dd', { hasText: /^Administrador$/ })).toHaveCount(1);
    await expect(page.getByRole('main')).not.toContainText(/CPF|CNPJ|CNH|senha/i);
  });

  test('reflow em 320 px com texto longo sem espaços (fretes)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.route('**/admin/fretes', async (rota) => {
      const resposta = await rota.fetch();
      const corpo = (await resposta.json()) as { fretes: Record<string, unknown>[] };
      corpo.fretes = corpo.fretes.map((frete) => ({
        ...frete,
        tipo_carga: SEM_ESPACOS,
        empresa: SEM_ESPACOS,
        motorista: SEM_ESPACOS,
        veiculo_placa: SEM_ESPACOS,
      }));
      await rota.fulfill({ response: resposta, json: corpo });
    });
    await page.goto('/admin/fretes');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
    const largura = await page.evaluate(
      () => (document.scrollingElement ?? document.documentElement).scrollWidth,
    );
    expect(largura).toBeLessThanOrEqual(320);
  });

  test('reflow em 320 px com texto longo sem espaços (usuários)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.route('**/admin/usuarios', async (rota) => {
      const resposta = await rota.fetch();
      const corpo = (await resposta.json()) as { usuarios: Record<string, unknown>[] };
      corpo.usuarios = corpo.usuarios.map((usuario) => ({
        ...usuario,
        nome: SEM_ESPACOS,
        email: `${SEM_ESPACOS}@${SEM_ESPACOS}.test`,
      }));
      await rota.fulfill({ response: resposta, json: corpo });
    });
    await page.goto('/admin/usuarios');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
    const largura = await page.evaluate(
      () => (document.scrollingElement ?? document.documentElement).scrollWidth,
    );
    expect(largura).toBeLessThanOrEqual(320);
  });
});
