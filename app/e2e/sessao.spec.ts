import { readFileSync } from 'node:fs';
import { entrarComoPerfil, expect, test, CHAVE_TOKEN } from './fixtures';
import type { Page } from '@playwright/test';

// Card 013: sessão, guardas de rota, 401 global, sair e a casca logada (ADR 0006).
// Entra por token de mock no localStorage; a API é o mock em localhost:4010.
const token = (page: Page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE_TOKEN);
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('restaurar a sessão', () => {
  test('recarregar a página mantém o usuário na sua área, sem novo login', async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/empresa/cargas');
    await expect(h1(page)).toHaveText('Minhas cargas');
    await page.reload();
    await expect(h1(page)).toHaveText('Minhas cargas');
    await expect(page).toHaveURL(/\/empresa\/cargas$/);
    expect(await token(page)).toBe('mock-empresa');
  });

  test('abrir "/" logado leva à área do perfil', async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/');
    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(h1(page)).toHaveText('Cargas próximas');
  });

  test('sem hidratação quebrada: nenhum erro nem aviso no console', async ({ page }) => {
    const problemas: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problemas.push(m.text());
    });
    page.on('pageerror', (e) => problemas.push(e.message));
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/empresa/cargas');
    await expect(h1(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(problemas).toEqual([]);
  });
});

test.describe('hidratação', () => {
  test('sessão restaurada ANTES de a rota hidratar não quebra a hidratação', async ({ page }) => {
    // Atrasa os chunks das rotas (não o núcleo): GET /eu volta primeiro e a sessão já está
    // autenticada quando a tela hidrata. O HTML estático (sem nome, sem dados) precisa continuar valendo.
    await page.route(/\/_expo\/static\/js\/web\/(?!entry|__|_layout)[^/]+\.js$/, async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 2500));
      await rota.continue();
    });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(h1(page)).toHaveText('Cargas próximas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('banner')).toBeVisible();
    expect(erros).toEqual([]);
  });
});

test.describe('guardas', () => {
  test('anônimo que abre uma área protegida vai ao login', async ({ page }) => {
    await page.goto('/empresa/cargas');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('motorista que abre /empresa/cargas vai a /motorista/cargas', async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/empresa/cargas');
    await expect(page).toHaveURL(/\/motorista\/cargas$/);
    await expect(h1(page)).toHaveText('Cargas próximas');
  });

  test('empresa que abre /motorista/cargas vai a /empresa/cargas', async ({ page }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/motorista/cargas');
    await expect(page).toHaveURL(/\/empresa\/cargas$/);
  });

  test('token inválido ou vencido: apaga o token e abre o login com o aviso (CT-04)', async ({
    page,
  }) => {
    await page.addInitScript((chave) => localStorage.setItem(chave, 'token-vencido'), CHAVE_TOKEN);
    await page.goto('/motorista/cargas');
    await expect(page).toHaveURL(/\/entrar\?aviso=sessao-expirada$/);
    expect(await token(page)).toBeNull();
  });
});

test.describe('sair', () => {
  test('apaga o token, abre o login e voltar a uma área protegida não mantém a sessão', async ({
    page,
  }) => {
    // Como `entrarComoPerfil`, mas sem regravar o token depois que o usuário saiu.
    await page.addInitScript((chave) => {
      if (!sessionStorage.getItem('saiu')) localStorage.setItem(chave, 'mock-empresa');
    }, CHAVE_TOKEN);
    await page.goto('/empresa/cargas');
    await expect(h1(page)).toHaveText('Minhas cargas');

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect.poll(() => token(page)).toBeNull();
    await page.evaluate(() => sessionStorage.setItem('saiu', '1'));

    // Voltar/abrir de novo a área protegida: a guarda devolve ao login.
    await page.goto('/empresa/cargas');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('administrador vê "sem telas nesta versão" e sai', async ({ page }) => {
    await entrarComoPerfil(page, 'admin');
    await page.goto('/admin');
    await expect(h1(page)).toHaveText('Perfil de administrador sem telas nesta versão');
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sair' }).last().click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect.poll(() => token(page)).toBeNull();
  });
});

test.describe('casca logada: navegação por largura', () => {
  for (const perfil of ['empresa', 'motorista'] as const) {
    const caminho = perfil === 'empresa' ? '/empresa/cargas' : '/motorista/cargas';
    const itens = perfil === 'empresa' ? 3 : 4;

    test(`${perfil}: exatamente 1 navegação visível e os links da área`, async ({ page }) => {
      await entrarComoPerfil(page, perfil);
      await page.goto(caminho);
      await expect(h1(page)).toBeVisible();

      const navegacao = page.getByRole('navigation', { name: 'Principal' });
      await expect(navegacao).toHaveCount(1);
      await expect(navegacao).toBeVisible();
      await expect(navegacao.getByRole('link')).toHaveCount(itens);
      await expect(navegacao.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
    });
  }

  test('em 320 px a navegação é a barra inferior, colada na base e visível', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'estreito', 'só vale na largura de 320 px');
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(h1(page)).toBeVisible();

    const barra = page.getByRole('navigation', { name: 'Principal' });
    await expect(barra).toBeVisible();
    const caixa = await barra.boundingBox();
    const alturaDaJanela = page.viewportSize()!.height;
    expect(caixa).not.toBeNull();
    expect(caixa!.y + caixa!.height).toBeGreaterThanOrEqual(alturaDaJanela - 1);
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(alturaDaJanela + 1);
    // O cabeçalho não duplica a navegação.
    await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(0);
  });

  test('em 1280 px a navegação fica no cabeçalho e não há barra inferior', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'só vale na largura de 1280 px');
    await entrarComoPerfil(page, 'empresa');
    await page.goto('/empresa/cargas');
    await expect(h1(page)).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('navigation', { name: 'Principal' }),
    ).toBeVisible();
  });

  test('o foco nunca fica escondido atrás da barra inferior (WCAG 2.4.11)', async ({ page }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.goto('/motorista/cargas');
    await expect(h1(page)).toBeVisible();
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const visivel = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        // Canto superior esquerdo e centro: algum outro elemento por cima (barra) esconderia o foco.
        const pontos: Array<[number, number]> = [
          [r.left + 2, r.top + 2],
          [r.left + r.width / 2, r.top + r.height / 2],
        ];
        const escondido = pontos.find(([x, y]) => {
          const topo = document.elementFromPoint(x, y);
          return !(topo !== null && (el === topo || el.contains(topo) || topo.contains(el)));
        });
        return escondido === undefined
          ? null
          : `${el.tagName} "${el.textContent}" em ${JSON.stringify(r)}`;
      });
      expect(visivel).toBeNull();
    }
  });
});

test.describe('HTML estático das rotas protegidas', () => {
  // Lê o export em dist/ (o que a Vercel entrega): cabeçalho e h1 já no HTML, sem redirecionar.
  const rotas = [
    { arquivo: 'empresa/cargas/index.html', h1: 'Minhas cargas' },
    { arquivo: 'motorista/cargas.html', h1: 'Cargas próximas' },
    { arquivo: 'admin/index.html', h1: 'Perfil de administrador sem telas nesta versão' },
  ];
  for (const { arquivo, h1: titulo } of rotas) {
    test(`${arquivo}: cabeçalho, main e h1 no HTML, sem script de redirecionamento`, () => {
      const html = readFileSync(`dist/${arquivo}`, 'utf8');
      expect(html).toMatch(new RegExp(`<h1[^>]*>${titulo}</h1>`));
      expect(html).toContain('<header');
      expect(html).toContain('<main');
      expect(html).not.toContain('http-equiv="refresh"');
    });
  }
});
