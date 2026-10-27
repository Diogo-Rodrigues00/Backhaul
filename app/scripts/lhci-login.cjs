// Script do Puppeteer chamado pelo Lighthouse CI antes de auditar cada URL (ADR 0012).
// Rotas logadas (/empresa/*, /motorista/*, /admin*) recebem o token de mock no
// localStorage; as públicas passam sem alteração.
// Só funciona com `settings.disableStorageReset: true` nos lighthouserc, senão o
// Lighthouse limpa o armazenamento antes de carregar a página.
const CHAVE_TOKEN = 'backhaul.token';

function tokenDaRota(caminho) {
  if (caminho.startsWith('/empresa')) return 'mock-empresa';
  if (caminho.startsWith('/motorista')) return 'mock-motorista';
  if (caminho === '/admin' || caminho.startsWith('/admin/')) return 'mock-admin';
  return null;
}

module.exports = async (browser, context) => {
  const url = new URL(context.url);
  const token = tokenDaRota(url.pathname);
  if (!token) return;

  // O localStorage é por origem: abre uma página do mesmo site só para gravar o token.
  const page = await browser.newPage();
  await page.goto(`${url.origin}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (chave, valor) => window.localStorage.setItem(chave, valor),
    CHAVE_TOKEN,
    token,
  );
  await page.close();
};
