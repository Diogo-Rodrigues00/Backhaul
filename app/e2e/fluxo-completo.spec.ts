import AxeBuilder from '@axe-core/playwright';
import type { Browser, BrowserContext, Page } from '@playwright/test';

import { entrarComoPerfil, expect, test } from './fixtures';

// Card 030: o roteiro da demo de ponta a ponta, em DUAS janelas (empresa e motorista), contra o mock
// COM ESTADO (mocks/estado.ts, mocks/handlers/comEstado.ts). Prova a jornada do PRD (seção 4.3) e a
// métrica "reflexo entre janelas <= 15 s" (seção 8) sem backend real.
//
// Quem é "do fluxo": e-mails @fluxo.test (login e cadastro) e tokens fluxo-*. Os outros specs seguem
// nos handlers sem estado; o mundo deste spec começa em POST /__mock/reset.
//
// Cobertura única, no projeto desktop (as duas janelas em 1280 px); o job `web` não dobra de tempo.
// eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturar o 1º argumento
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop', 'cobertura única, no projeto desktop');
});

const API = 'http://localhost:4010';
const SENHA = 'senhaSegura8';
const EMPRESA = { email: 'empresa@fluxo.test', nome: 'Transportes Rápidos LTDA' };
const MOTORISTA_MOPP = { email: 'joao@fluxo.test', nome: 'João da Silva' };
const CARGA = 'Produtos inflamáveis';
const MOPP = 'MOPP - Classe 3 Inflamáveis';
const VALOR_CONTRAPROPOSTA = '3200,00';
/** O polling é de 10 s (ADR 0010); o PRD aceita até 15 s entre as janelas. */
const LIMITE_REFLEXO_MS = 15_000;

const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** axe com 0 violações no estado em que a tela está agora (estados com dados reais do fluxo). */
async function axeSemViolacoes(page: Page) {
  // Espera as transições terminarem: o axe mediria o contraste de um quadro no meio do fade.
  await page.waitForFunction(
    () => document.getAnimations().every((animacao) => animacao.playState !== 'running'),
    undefined,
    { timeout: 5_000 },
  );
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  expect(
    resultado.violations.map(
      (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    ),
  ).toEqual([]);
}

/** O mesmo, nos dois temas (a janela volta ao tema claro no fim). */
async function axeNosDoisTemas(page: Page) {
  for (const esquema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: esquema });
    await axeSemViolacoes(page);
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const moeda = (valor: string) => new RegExp(`R\\$\\s*${valor}`);

// Tudo que a região viva global (role=status, aria-live=polite) falou nesta janela, na ordem.
// A região limpa o texto depois de 8 s; o observador guarda cada frase para o teste conferir.
async function observarAnuncios(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __anuncios: string[] };
    w.__anuncios = [];
    const iniciar = () => {
      const regiao = document.querySelector('[role="status"][aria-live="polite"]');
      if (!regiao) return false;
      new MutationObserver(() => {
        const texto = (regiao.textContent ?? '').trim();
        if (texto !== '' && w.__anuncios[w.__anuncios.length - 1] !== texto)
          w.__anuncios.push(texto);
      }).observe(regiao, { childList: true, subtree: true, characterData: true });
      return true;
    };
    const esperar = setInterval(() => {
      if (iniciar()) clearInterval(esperar);
    }, 50);
  });
}

// Quem tem o foco agora (para provar que uma novidade chegando por polling não o move).
const descreverFoco = (page: Page) =>
  page.evaluate(() => {
    const ativo = document.activeElement;
    return ativo ? `${ativo.tagName}#${ativo.id}.${ativo.getAttribute('role') ?? ''}` : 'nenhum';
  });

const anuncios = (page: Page) =>
  page.evaluate(() => (window as unknown as { __anuncios?: string[] }).__anuncios ?? []);

async function abrirJanela(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({
    baseURL,
    locale: 'pt-BR',
    viewport: { width: 1280, height: 800 },
  });
  await observarAnuncios(context);
  return { context, page: await context.newPage() };
}

async function entrar(page: Page, email: string, rotaEsperada: RegExp) {
  await page.goto('/entrar');
  await expect(h1(page)).toHaveText('Entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(rotaEsperada);
}

async function escolherCidade(page: Page, campo: string, busca: string, nome: string) {
  await page.getByRole('combobox', { name: campo }).fill(busca);
  await page.getByRole('option', { name: nome }).click();
}

async function publicarDisponibilidade(page: Page) {
  await expect(h1(page)).toHaveText('Publicar disponibilidade');
  await escolherCidade(page, 'Ou escolha a cidade', 'uberl', 'Uberlândia - MG');
  await page.getByLabel('Raio de busca (km)').fill('80');
  await page.getByRole('button', { name: 'Publicar disponibilidade' }).click();
  await expect(page).toHaveURL(/\/motorista\/cargas$/);
  await expect(h1(page)).toHaveText('Cargas próximas');
}

/** Mede quanto a outra janela levou para refletir o que acabou de acontecer (`t0`). */
async function medirReflexo(t0: number, esperar: Promise<unknown>): Promise<number> {
  await esperar;
  return Date.now() - t0;
}

test('roteiro da demo: cadastro, carga crítica MOPP, proposta, aceite, frete, pagamento e entrega', async ({
  browser,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const inicioDoFluxo = Date.now();
  const reflexos: Record<string, number> = {};
  const tempos: Record<string, number> = {};
  let focoAntesDaProposta = '';
  const marcar = (nome: string) => {
    tempos[nome] = Date.now() - inicioDoFluxo;
  };

  const reinicio = await fetch(`${API}/__mock/reset`, { method: 'POST' });
  expect(reinicio.ok).toBe(true);

  const empresa = await abrirJanela(browser, baseURL);
  const motorista = await abrirJanela(browser, baseURL);
  const novato = await abrirJanela(browser, baseURL);
  const [janelaE, janelaM, janelaN] = [empresa.page, motorista.page, novato.page];

  try {
    // ---------------------------------------------------------------- janela A: a empresa
    await test.step('A1. empresa entra e publica a carga crítica que exige MOPP', async () => {
      await entrar(janelaE, EMPRESA.email, /\/empresa\/cargas$/);
      await expect(h1(janelaE)).toHaveText('Minhas cargas');
      await janelaE.goto('/empresa/cargas/nova');
      await expect(h1(janelaE)).toHaveText('Publicar carga');

      await janelaE.getByLabel('Tipo de carga').fill(CARGA);
      await escolherCidade(janelaE, 'Origem', 'uberl', 'Uberlândia - MG');
      await escolherCidade(janelaE, 'Destino', 'ubera', 'Uberaba - MG');
      await janelaE.getByLabel('Peso (kg)').fill('8000');
      await janelaE.getByLabel('Valor oferecido (R$)').fill('3500,00');
      await janelaE.getByRole('radio', { name: 'Crítico' }).click();
      await janelaE.getByLabel('Certificação exigida (opcional)').selectOption({ label: MOPP });
      const envio = janelaE.waitForRequest(
        (req) => req.method() === 'POST' && req.url().endsWith('/cargas'),
      );
      await janelaE.getByRole('button', { name: 'Publicar carga' }).click();

      const corpo = (await envio).postDataJSON() as Record<string, unknown>;
      expect(corpo.urgencia).toBe('critico');
      expect(corpo.certificacao_requerida_id).toEqual(expect.any(String));
      await expect(janelaE).toHaveURL(/\/empresa\/cargas$/);
      const lista = janelaE.getByRole('list', { name: 'Cargas publicadas' });
      await expect(lista.getByRole('listitem')).toHaveCount(2);
      await expect(lista.getByRole('listitem').first()).toContainText(CARGA);
      marcar('empresa publicou a carga');
    });

    // ---------------------------------------------------------------- cadastro ao vivo do motorista novo
    await test.step('B1. motorista novo: cadastro com 8 campos, login automático, sem MOPP não vê a carga crítica', async () => {
      const email = `novato.${Date.now()}@fluxo.test`;
      await janelaN.goto('/cadastro/motorista');
      await expect(h1(janelaN)).toHaveText('Cadastro de motorista');
      const campo = (nome: string) => janelaN.getByRole('textbox', { name: nome, exact: true });
      await campo('E-mail').fill(email);
      await campo('Senha').fill(SENHA);
      await campo('Nome completo').fill('Carlos Pereira');
      await campo('CPF').fill(String(Date.now()).slice(-11).padStart(11, '0'));
      await campo('CNH').fill('55566677788');
      await campo('Tipo de veículo').fill('Truck');
      await campo('Placa').fill('QWE4R56');
      await campo('Capacidade em kg').fill('12000');
      const cadastro = janelaN.waitForRequest(
        (req) => req.method() === 'POST' && req.url().endsWith('/cadastro/motorista'),
      );
      await janelaN.keyboard.press('Enter');
      const enviado = (await cadastro).postDataJSON() as Record<string, unknown>;
      expect(Object.keys(enviado).sort()).toEqual(
        [
          'capacidade_kg',
          'cnh',
          'cpf',
          'email',
          'nome_completo',
          'senha',
          'veiculo_placa',
          'veiculo_tipo',
        ].sort(),
      );

      // Login automático: cai direto em "Cargas próximas", ainda sem disponibilidade.
      await expect(janelaN).toHaveURL(/\/motorista\/cargas$/);
      await expect(h1(janelaN)).toHaveText('Cargas próximas');
      await janelaN.getByRole('link', { name: 'Publicar disponibilidade' }).first().click();
      await publicarDisponibilidade(janelaN);

      // Sem MOPP: a lista só tem a carga comum (Grãos); a crítica que exige MOPP não aparece.
      const lista = janelaN.getByRole('list', { name: 'Cargas próximas' });
      await expect(lista.getByRole('article')).toHaveCount(1);
      await expect(lista.getByRole('article', { name: 'Grãos' })).toBeVisible();
      await expect(janelaN.getByRole('article', { name: CARGA })).toHaveCount(0);
      marcar('motorista novo sem MOPP não vê a crítica');
    });

    // ---------------------------------------------------------------- janela B: o motorista com MOPP
    await test.step('B2. motorista com MOPP entra, publica disponibilidade e vê a carga crítica primeiro', async () => {
      await entrar(janelaM, MOTORISTA_MOPP.email, /\/motorista\/cargas$/);
      await expect(h1(janelaM)).toHaveText('Cargas próximas');
      await janelaM.getByRole('link', { name: 'Publicar disponibilidade' }).first().click();
      await publicarDisponibilidade(janelaM);

      const lista = janelaM.getByRole('list', { name: 'Cargas próximas' });
      await expect(lista.getByRole('article')).toHaveCount(2);
      // Ordem do contrato: crítico antes do normal.
      await expect(lista.getByRole('heading', { level: 2 })).toHaveText([CARGA, 'Grãos']);
      const critica = janelaM.getByRole('article', { name: CARGA });
      await expect(critica.getByText('Crítico')).toBeVisible();
      await expect(critica.getByText(MOPP)).toBeVisible();
      await axeNosDoisTemas(janelaM);
      marcar('motorista com MOPP vê a crítica');
    });

    // A empresa fica na tela de propostas da carga, esperando (polling de 10 s).
    await test.step('A2. empresa abre as propostas da carga: ainda nenhuma', async () => {
      await janelaE.getByRole('link', { name: `Ver propostas de ${CARGA}` }).click();
      await expect(janelaE).toHaveURL(/\/empresa\/cargas\/detalhe\?id=/);
      await expect(janelaE.getByText('Nenhuma proposta ainda')).toBeVisible();
      focoAntesDaProposta = await descreverFoco(janelaE);
    });

    // O motorista com MOPP deixa a tela de fretes aberta para ver o frete aparecer sozinho depois.
    const janelaMFretes = await motorista.context.newPage();
    await test.step('B3. motorista abre "Meus fretes" (vazio) e deixa a aba aberta', async () => {
      // Relógio falso desde antes da página carregar: dá para avançar os 10 s do polling sem esperá-los.
      await janelaMFretes.clock.install();
      await janelaMFretes.goto('/motorista/fretes');
      await expect(h1(janelaMFretes)).toHaveText('Meus fretes');
      await expect(janelaMFretes.getByText('Nenhum frete ainda')).toBeVisible();
    });

    // ---------------------------------------------------------------- contraproposta e primeiro reflexo (tempo real)
    let t0Proposta = 0;
    await test.step('B4. motorista com MOPP faz a contraproposta', async () => {
      await janelaM.bringToFront();
      const botao = janelaM.getByRole('button', {
        name: new RegExp(`^Contraproposta para ${CARGA}`),
      });
      await botao.click();
      const dialogo = janelaM.getByRole('alertdialog', { name: 'Enviar contraproposta?' });
      await dialogo.getByLabel('Valor proposto (R$)').fill(VALOR_CONTRAPROPOSTA);
      const resposta = janelaM.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().endsWith('/propostas'),
      );
      await dialogo.getByRole('button', { name: 'Enviar contraproposta' }).click();
      expect((await resposta).status()).toBe(201);
      t0Proposta = Date.now();
      await expect(
        janelaM
          .getByRole('article', { name: CARGA })
          .getByText('Proposta enviada', { exact: true }),
      ).toBeVisible();
      marcar('motorista enviou a contraproposta');
    });

    await test.step('A3. REFLEXO (tempo real do polling): a proposta aparece na janela da empresa sem clique', async () => {
      await janelaE.bringToFront();
      reflexos['proposta chega à empresa (polling real)'] = await medirReflexo(
        t0Proposta,
        expect(janelaE.getByRole('heading', { level: 3, name: MOTORISTA_MOPP.nome })).toBeVisible({
          timeout: LIMITE_REFLEXO_MS,
        }),
      );
      expect(reflexos['proposta chega à empresa (polling real)']).toBeLessThanOrEqual(
        LIMITE_REFLEXO_MS,
      );
      await expect(janelaE.getByRole('heading', { level: 2, name: 'Propostas (1)' })).toBeVisible();
      // Chegou com anúncio na região viva e sem mover o foco.
      expect(await anuncios(janelaE)).toContain('1 nova proposta');
      expect(await descreverFoco(janelaE)).toBe(focoAntesDaProposta);
      const proposta = janelaE.getByRole('heading', { level: 3, name: MOTORISTA_MOPP.nome });
      await expect(proposta).toBeVisible();
      await expect(janelaE.getByText(moeda('3\\.200,00')).first()).toBeVisible();
      await axeNosDoisTemas(janelaE);
      marcar('empresa viu a proposta chegar');
    });

    // ---------------------------------------------------------------- aceite e frete
    await test.step('A4. empresa aceita a proposta: frete criado', async () => {
      await janelaE
        .getByRole('button', { name: `Aceitar proposta de ${MOTORISTA_MOPP.nome}` })
        .click();
      const dialogo = janelaE.getByRole('alertdialog', {
        name: `Aceitar a proposta de ${MOTORISTA_MOPP.nome}?`,
      });
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('button', { name: 'Aceitar proposta', exact: true }).click();
      await expect(dialogo).toBeHidden();
      await expect(janelaE.locator('#conteudo').getByText('Frete criado')).toBeVisible();
      await janelaE.getByRole('link', { name: 'Ver fretes' }).last().click();
      await expect(janelaE).toHaveURL(/\/empresa\/fretes$/);
      const cartao = janelaE.getByRole('article', { name: CARGA });
      await expect(cartao).toBeVisible();
      await expect(cartao.getByText(MOTORISTA_MOPP.nome)).toBeVisible();
      await expect(cartao.getByRole('button', { name: `Pagar frete de ${CARGA}` })).toBeVisible();
      marcar('empresa aceitou, frete criado');
    });
    const tAceite = Date.now();

    await test.step('B5. REFLEXO (relógio acelerado): o frete aparece na janela do motorista', async () => {
      await janelaMFretes.bringToFront();
      // Acelera o polling: o relógio falso avança além dos 10 s sem esperá-los.
      await janelaMFretes.clock.fastForward(11_000);
      const cartao = janelaMFretes.getByRole('article', { name: CARGA });
      await expect(cartao).toBeVisible({ timeout: 5_000 });
      reflexos['frete chega ao motorista (relógio acelerado)'] = Date.now() - tAceite;
      await expect(cartao.getByText('Aguardando pagamento')).toBeVisible();
      await expect(
        janelaMFretes.getByRole('button', { name: `Iniciar transporte de ${CARGA}` }),
      ).toBeVisible();
    });

    await test.step('B6. motorista inicia o transporte', async () => {
      const dialogo = janelaMFretes.getByRole('alertdialog', {
        name: `Iniciar o transporte de ${CARGA}?`,
      });
      await janelaMFretes.getByRole('button', { name: `Iniciar transporte de ${CARGA}` }).click();
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('button', { name: 'Iniciar transporte' }).click();
      await expect(dialogo).toBeHidden();
      await expect(
        janelaMFretes.getByRole('article', { name: CARGA }).getByText('Status atualizado.'),
      ).toBeVisible();
      marcar('motorista iniciou o transporte');
    });
    const tInicio = Date.now();

    await test.step('A5. REFLEXO (tempo real do polling): a empresa vê o andamento mudar para "Em trânsito"', async () => {
      await janelaE.bringToFront();
      const cartao = janelaE.getByRole('article', { name: CARGA });
      reflexos['andamento muda na empresa (polling real)'] = await medirReflexo(
        tInicio,
        expect(cartao.locator('[aria-current="step"]')).toContainText('Em trânsito', {
          timeout: LIMITE_REFLEXO_MS,
        }),
      );
      expect(reflexos['andamento muda na empresa (polling real)']).toBeLessThanOrEqual(
        LIMITE_REFLEXO_MS,
      );
      expect(await anuncios(janelaE)).toContain(`Transporte iniciado: ${CARGA}`);
      marcar('empresa viu em trânsito');
    });

    // ---------------------------------------------------------------- pagamento simulado
    let transacao: Record<string, unknown> = {};
    await test.step('A6. empresa paga: comissão, percentual e status exatamente como a API devolveu', async () => {
      const cartao = janelaE.getByRole('article', { name: CARGA });
      await cartao.getByRole('button', { name: `Pagar frete de ${CARGA}` }).click();
      const dialogo = janelaE.getByRole('alertdialog');
      await expect(dialogo.getByRole('heading', { name: moeda('3\\.200,00') })).toBeVisible();
      const resposta = janelaE.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().endsWith('/pagamento'),
      );
      await dialogo.getByRole('button', { name: 'Pagar frete', exact: true }).click();
      const corpo = (await (await resposta).json()) as { transacao: Record<string, unknown> };
      transacao = corpo.transacao;

      // O mock do fluxo devolve 7,5% de propósito (não os 5% do backend): se o app fixasse ou
      // calculasse a comissão, estes números não bateriam com o que a API respondeu.
      expect(transacao.percentual_comissao).toBe(7.5);
      expect(transacao.valor_comissao).toBe(240);
      expect(transacao.status_pagamento).toBe('retido');
      const resumo = janelaE.getByRole('group', { name: 'Resumo do pagamento' });
      await expect(resumo).toBeVisible();
      await expect(resumo).toContainText(moeda('3\\.200,00'));
      await expect(resumo).toContainText(/7,5\s*%/);
      await expect(resumo).toContainText(moeda('240,00'));
      await expect(resumo).toContainText('Pago, retido até a entrega');
      expect(await anuncios(janelaE)).toContain('Pagamento registrado');
      await axeNosDoisTemas(janelaE);
      marcar('empresa pagou');
    });
    const tPagamento = Date.now();

    await test.step('B7. REFLEXO (relógio acelerado): o motorista vê o pagamento "retido até a entrega"', async () => {
      await janelaMFretes.bringToFront();
      await janelaMFretes.clock.fastForward(11_000);
      const cartao = janelaMFretes.getByRole('article', { name: CARGA });
      await expect(cartao.getByText('Pago, retido até a entrega')).toBeVisible({ timeout: 5_000 });
      reflexos['pagamento chega ao motorista (relógio acelerado)'] = Date.now() - tPagamento;
      expect(await anuncios(janelaMFretes)).toContain(
        `Pagamento recebido: ${CARGA} (retido até a entrega)`,
      );
    });

    // ---------------------------------------------------------------- entrega e liberação
    await test.step('B8. motorista confirma a entrega: "Liberado ao motorista"', async () => {
      const dialogo = janelaMFretes.getByRole('alertdialog', {
        name: `Confirmar a entrega de ${CARGA}?`,
      });
      await janelaMFretes.getByRole('button', { name: `Confirmar entrega de ${CARGA}` }).click();
      await expect(dialogo).toBeVisible();
      await dialogo.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
      await expect(dialogo).toBeHidden();
      const cartao = janelaMFretes.getByRole('article', { name: CARGA });
      await expect(cartao.getByText('Liberado ao motorista', { exact: true })).toBeVisible();
      await expect(
        cartao.getByText('Entrega confirmada. Pagamento liberado ao motorista.'),
      ).toBeVisible();
      await expect(cartao.getByRole('button')).toHaveCount(0);
      marcar('motorista confirmou a entrega');
    });
    const tEntrega = Date.now();

    await test.step('A7. REFLEXO (tempo real do polling): a empresa vê "Entregue" e o pagamento liberado', async () => {
      await janelaE.bringToFront();
      const cartao = janelaE.getByRole('article', { name: CARGA });
      reflexos['entrega chega à empresa (polling real)'] = await medirReflexo(
        tEntrega,
        expect(cartao.locator('[aria-current="step"]')).toContainText('Entregue', {
          timeout: LIMITE_REFLEXO_MS,
        }),
      );
      expect(reflexos['entrega chega à empresa (polling real)']).toBeLessThanOrEqual(
        LIMITE_REFLEXO_MS,
      );
      expect(await anuncios(janelaE)).toContain(`Entrega confirmada: ${CARGA}`);
      // A API já liberou o pagamento na mesma transação da entrega: a tela mostra o que ela devolve.
      // No resumo guardado do pagamento (card 030: bug de status velho) e na linha "Pagamento" do frete.
      const resumo = cartao.getByRole('group', { name: 'Resumo do pagamento' });
      await expect(resumo).toContainText('Liberado ao motorista');
      await expect(resumo).toContainText(/7,5\s*%/);
      await expect(cartao.getByText('Liberado ao motorista', { exact: true })).toHaveCount(2);
      await expect(cartao.getByText('Pago, retido até a entrega')).toHaveCount(0);
      await axeNosDoisTemas(janelaE);
      await axeNosDoisTemas(janelaMFretes);
      marcar('empresa viu entregue e liberado');
    });
  } finally {
    const total = Date.now() - inicioDoFluxo;
    const resumo = { total_ms: total, etapas_ms: tempos, reflexos_ms: reflexos };
    console.log(`FLUXO ${JSON.stringify(resumo)}`);
    await info.attach('tempos-do-fluxo.json', {
      body: JSON.stringify(resumo, null, 2),
      contentType: 'application/json',
    });
    await Promise.all([empresa.context.close(), motorista.context.close(), novato.context.close()]);
  }
});

// Card 030, checklist de performance (ADR 0010): aba oculta = nenhuma requisição das telas que se
// atualizam sozinhas. O relógio falso avança 30 s sem esperá-los; a aba "oculta" é emulada com o
// mesmo evento que o navegador dispara (`visibilitychange`), que o TanStack Query escuta.
const ID_CARGA_COM_PROPOSTAS = 'cccccccc-0000-4000-8000-000000000001';
const TELAS_COM_ATUALIZACAO_AUTOMATICA = [
  { nome: 'Meus fretes (empresa)', perfil: 'empresa', rota: '/empresa/fretes', h1: 'Meus fretes' },
  {
    nome: 'Meus fretes (motorista)',
    perfil: 'motorista',
    rota: '/motorista/fretes',
    h1: 'Meus fretes',
  },
  {
    nome: 'Propostas da carga',
    perfil: 'empresa',
    rota: `/empresa/cargas/detalhe?id=${ID_CARGA_COM_PROPOSTAS}`,
    h1: 'Propostas da carga',
  },
] as const;

for (const tela of TELAS_COM_ATUALIZACAO_AUTOMATICA) {
  test(`aba oculta por 30 s: nenhuma requisição à API em "${tela.nome}"`, async ({ page }) => {
    const requisicoes: string[] = [];
    page.on('request', (req) => {
      if (req.url().startsWith(API))
        requisicoes.push(`${req.method()} ${new URL(req.url()).pathname}`);
    });
    await entrarComoPerfil(page, tela.perfil);
    await page.clock.install();
    await page.goto(tela.rota);
    await expect(h1(page)).toHaveText(tela.h1);
    await expect(
      page
        .getByRole('article')
        .or(page.getByRole('heading', { level: 3 }))
        .first(),
    ).toBeVisible();

    // Controle: com a aba visível, 30 s de relógio trazem leituras novas (o teste enxerga o polling).
    let antes = requisicoes.length;
    await page.clock.runFor(30_000);
    await expect.poll(() => requisicoes.length - antes).toBeGreaterThanOrEqual(2);

    // Aba oculta: nenhuma leitura em 30 s.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(500); // deixa terminar o que já estava em voo
    antes = requisicoes.length;
    await page.clock.runFor(30_000);
    await page.waitForTimeout(500);
    expect(requisicoes.slice(antes)).toEqual([]);
  });
}
