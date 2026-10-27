// URLs do Lighthouse CI geradas de e2e/rotas.ts (lista única de rotas, ADR 0012).
// Lê o arquivo como texto para não depender de TypeScript dentro do LHCI.
// Falha se alguma rota não for lida ou se uma rota real não tiver o .html em dist/
// (quem reprovaria depois seria o Lighthouse, com uma mensagem pouco clara).
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const BASE = process.env.LHCI_BASE_URL ?? 'http://localhost:4173';
const RAIZ_APP = join(__dirname, '..');

function lerRotas() {
  const fonte = readFileSync(join(RAIZ_APP, 'e2e', 'rotas.ts'), 'utf8');
  // Aceita aspas simples, duplas e crases; `naoEncontrada: true` marca a rota que cai na página 404.
  const rotas = [...fonte.matchAll(/caminho:\s*(['"`])([^'"`]+)\1([^}]*)\}/g)].map((m) => ({
    caminho: m[2],
    naoEncontrada: /naoEncontrada:\s*true/.test(m[3] ?? ''),
  }));
  const declaradas = (fonte.match(/\bcaminho\s*:/g) ?? []).length;
  if (rotas.length === 0 || rotas.length !== declaradas) {
    throw new Error(
      `e2e/rotas.ts: ${declaradas} rota(s) declarada(s), ${rotas.length} lida(s). ` +
        'Use `caminho: "/x"` com string simples.',
    );
  }
  return rotas;
}

// Arquivo que o export gera para a rota: "/" -> index.html, "/a/b" -> a/b.html. Rota de pasta com
// `index.tsx` (ex.: /admin, /empresa/cargas) sai como a/b/index.html.
function htmlsDaRota(caminho) {
  // A query (?id=...) não faz parte do arquivo: o export gera um .html por rota (ADR 0002).
  const semQuery = caminho.split('?')[0];
  if (semQuery === '/') return [join(RAIZ_APP, 'dist', 'index.html')];
  const relativo = semQuery.slice(1);
  return [
    join(RAIZ_APP, 'dist', `${relativo}.html`),
    join(RAIZ_APP, 'dist', relativo, 'index.html'),
  ];
}

function verificarDist(rotas = lerRotas()) {
  const faltando = rotas
    .filter(
      (r) => !r.naoEncontrada && !htmlsDaRota(r.caminho).some((arquivo) => existsSync(arquivo)),
    )
    .map((r) => r.caminho);
  if (faltando.length > 0) {
    throw new Error(
      `dist/ sem .html para as rotas de e2e/rotas.ts: ${faltando.join(', ')}. ` +
        'Rode `npm run export:ci` ou corrija a lista de rotas.',
    );
  }
}

const rotas = lerRotas();
module.exports = {
  base: BASE,
  rotas,
  verificarDist,
  urls: rotas.map((r) => `${BASE}${r.caminho}`),
};
