import { entrarComoPerfil, expect, test } from './fixtures';

// ADR 0004 (adendo): o TanStack Query vem num chunk sob demanda (`consultas-*.js`). Se ele não baixar
// (sem conexão, ou um deploy novo trocou os arquivos), a tela não pode ficar morta: avisa, oferece
// "Tentar de novo" e, voltando a rede, carrega. A API é o mock em localhost:4010.
// A rota fica no contexto: as novas tentativas de <script> não passam por `page.route`.
const CHUNK_CONSULTAS = /\/_expo\/static\/js\/web\/consultas-[^/]+\.js$/;

test.describe('chunk das consultas fora do ar', () => {
  test('Minhas cargas: avisa com "Tentar de novo" e carrega quando o chunk volta', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'empresa');
    await page.context().route(CHUNK_CONSULTAS, (rota) => rota.abort());

    await page.goto('/empresa/cargas');
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas cargas' })).toBeVisible();
    const aviso = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar esta tela.' });
    await expect(aviso).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('list', { name: 'Cargas publicadas' })).toHaveCount(0);

    await page.context().unroute(CHUNK_CONSULTAS);
    await aviso.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(page.getByRole('list', { name: 'Cargas publicadas' })).toBeVisible();
    await expect(aviso).toHaveCount(0);
  });

  test('área do motorista não cai: Disponibilidades mostra o erro e recupera ao tentar de novo', async ({
    page,
  }) => {
    await entrarComoPerfil(page, 'motorista');
    await page.context().route(CHUNK_CONSULTAS, (rota) => rota.abort());

    await page.goto('/motorista/disponibilidades');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minhas disponibilidades' }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    const erro = page.getByRole('alert').filter({ hasText: 'Algo deu errado' });
    await expect(erro).toBeVisible({ timeout: 15_000 });

    await page.context().unroute(CHUNK_CONSULTAS);
    await erro.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(erro).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Disponibilidades publicadas' })).toBeVisible();
  });
});
