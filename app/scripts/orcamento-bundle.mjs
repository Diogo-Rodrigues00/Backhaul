// Orçamento de bundle (ADR 0011). Roda sobre dist/ depois de `npm run export:ci`.
// Falha (exit 1) se algum limite estourar ou se código de mock chegar à produção.
// Os limites podem ser sobrescritos por variável de ambiente (em KB gzip), só para testar o portão:
//   ORCAMENTO_JS_INICIAL_KB=100 npm run orcamento
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const lerLimite = (nome, padrao) => {
  const valor = Number(process.env[nome]);
  return (Number.isFinite(valor) && valor > 0 ? valor : padrao) * KB;
};

const LIMITES = {
  jsInicial: lerLimite('ORCAMENTO_JS_INICIAL_KB', 300), // todos os <script> do HTML da rota
  chunkRota: lerLimite('ORCAMENTO_CHUNK_ROTA_KB', 30), // cada chunk assíncrono (rota)
  css: lerLimite('ORCAMENTO_CSS_KB', 15), // CSS total
  fontes: lerLimite('ORCAMENTO_FONTES_KB', 40), // woff2 somados
  html: lerLimite('ORCAMENTO_HTML_KB', 40), // HTML de cada rota
};
const MAX_ARQUIVOS_FONTE = 2;
const PROIBIDOS_NO_JS = ['mockServiceWorker', 'setupWorker'];

const raiz = join(process.cwd(), 'dist');

function listar(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? listar(caminho) : [caminho];
  });
}

const gzip = (caminho) => gzipSync(readFileSync(caminho), { level: 9 }).length;
const nomeRel = (caminho) => relative(raiz, caminho).replaceAll('\\', '/');
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

let arquivos;
try {
  arquivos = listar(raiz);
} catch {
  console.error('dist/ não existe. Rode `npm run export:ci` antes.');
  process.exit(1);
}

const falhas = [];
const checar = (descricao, medido, limite) => {
  const ok = medido <= limite;
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${descricao}: ${kb(medido)} (limite ${kb(limite)})`);
  if (!ok) falhas.push(descricao);
};

const htmls = arquivos.filter((a) => a.endsWith('.html'));

for (const html of htmls) {
  const conteudo = readFileSync(html, 'utf8');
  const srcs = [...conteudo.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  let total = 0;
  for (const src of srcs) {
    const arquivo = join(raiz, src.split('?')[0]);
    total += gzip(arquivo);
  }
  checar(`JS inicial de ${nomeRel(html)}`, total, LIMITES.jsInicial);
  checar(`HTML de ${nomeRel(html)}`, gzip(html), LIMITES.html);
}

// Chunk próprio de cada rota (asyncRoutes): todo .js que não é o núcleo (entry-*, __common-*,
// __expo-metro-runtime-*). O núcleo já entra no limite do JS inicial.
const js = arquivos.filter((a) => a.endsWith('.js'));
for (const chunk of js.filter((a) => !/^(entry-|__)/.test(basename(a)))) {
  checar(`Chunk de rota ${nomeRel(chunk)}`, gzip(chunk), LIMITES.chunkRota);
}

const css = arquivos.filter((a) => a.endsWith('.css'));
checar(
  'CSS total',
  css.reduce((soma, a) => soma + gzip(a), 0),
  LIMITES.css,
);

const fontes = arquivos.filter((a) => a.endsWith('.woff2'));
checar(
  `Fontes woff2 (${fontes.length})`,
  fontes.reduce((soma, a) => soma + statSync(a).size, 0),
  LIMITES.fontes,
);
if (fontes.length > MAX_ARQUIVOS_FONTE) {
  console.log(`FALHA mais de ${MAX_ARQUIVOS_FONTE} arquivos de fonte: ${fontes.length}`);
  falhas.push('Quantidade de fontes');
}

// MSW nunca no bundle de produção (ADR 0011, item 8).
for (const arquivo of js) {
  const conteudo = readFileSync(arquivo, 'utf8');
  for (const termo of PROIBIDOS_NO_JS) {
    if (conteudo.includes(termo)) {
      console.log(`FALHA ${nomeRel(arquivo)} contém "${termo}" (mock no bundle de produção)`);
      falhas.push(`${termo} em ${nomeRel(arquivo)}`);
    }
  }
}

if (falhas.length > 0) {
  console.error(`\nOrçamento estourado em ${falhas.length} item(ns).`);
  process.exit(1);
}
console.log('\nOrçamento respeitado.');
