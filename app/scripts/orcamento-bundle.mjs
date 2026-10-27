// Orçamento de bundle (ADR 0011). Roda sobre dist/ depois de `npm run export:ci`.
// Falha (exit 1) se algum limite estourar ou se código de mock chegar à produção.
// Limites em bytes (1 KiB = 1024 B, gzip nível 9). Podem ser sobrescritos por variável de
// ambiente, em BYTES, só para testar o portão:
//   ORCAMENTO_JS_INICIAL_BYTES=102400 npm run orcamento
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const KIB = 1024;
const lerLimite = (nome, padrao) => {
  const valor = Number(process.env[nome]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
};

const LIMITES = {
  jsInicial: lerLimite('ORCAMENTO_JS_INICIAL_BYTES', 360 * KIB), // todos os <script> do HTML da rota
  chunkRota: lerLimite('ORCAMENTO_CHUNK_ROTA_BYTES', 30 * KIB), // cada chunk assíncrono (rota)
  css: lerLimite('ORCAMENTO_CSS_BYTES', 15 * KIB), // CSS total
  fontes: lerLimite('ORCAMENTO_FONTES_BYTES', 40 * KIB), // woff2 somados
  html: lerLimite('ORCAMENTO_HTML_BYTES', 40 * KIB), // HTML de cada rota
};
const MAX_ARQUIVOS_FONTE = 2;
const PROIBIDOS_NO_JS = ['mockServiceWorker', 'setupWorker'];
// O TanStack Query só carrega nas áreas logadas, num chunk sob demanda (ADR 0004, adendo): este texto
// vem do pacote e não pode estar em nenhum <script> do HTML de rota alguma (JS inicial).
const TANSTACK_NO_JS = 'No QueryClient set';

const raiz = join(process.cwd(), 'dist');

function listar(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? listar(caminho) : [caminho];
  });
}

const gzip = (caminho) => gzipSync(readFileSync(caminho), { level: 9 }).length;
const nomeRel = (caminho) => relative(raiz, caminho).replaceAll('\\', '/');
const kib = (bytes) => `${(bytes / KIB).toFixed(1)} KiB`;

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
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${descricao}: ${kib(medido)} (limite ${kib(limite)})`);
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
    if (readFileSync(arquivo, 'utf8').includes(TANSTACK_NO_JS)) {
      console.log(
        `FALHA ${nomeRel(html)}: o TanStack Query está em ${nomeRel(arquivo)} (JS inicial)`,
      );
      falhas.push(`TanStack no JS inicial de ${nomeRel(html)}`);
    }
  }
  checar(`JS inicial de ${nomeRel(html)}`, total, LIMITES.jsInicial);
  checar(`HTML de ${nomeRel(html)}`, gzip(html), LIMITES.html);
}

// Chunk próprio de cada rota (asyncRoutes): todo .js que não é o núcleo (entry-*, __common-*,
// __expo-metro-runtime-*). O núcleo já entra no limite do JS inicial.
// Só arquivos de _expo/: sw.js e mockServiceWorker.js (public/) não são chunks do app.
const js = arquivos.filter((a) => a.endsWith('.js') && nomeRel(a).startsWith('_expo/'));
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

// MSW nunca no bundle de produção (ADR 0011, item 8). O sw.js do PWA cita "mockServiceWorker"
// de propósito (para não cacheá-lo) e por isso fica fora da lista `js`.
for (const arquivo of js) {
  const conteudo = readFileSync(arquivo, 'utf8');
  for (const termo of PROIBIDOS_NO_JS) {
    if (conteudo.includes(termo)) {
      console.log(`FALHA ${nomeRel(arquivo)} contém "${termo}" (mock no bundle de produção)`);
      falhas.push(`${termo} em ${nomeRel(arquivo)}`);
    }
  }
}

// TanStack Query só no chunk sob demanda `consultas-*.js` (ADR 0004, adendo). Controle positivo: o
// marcador PRECISA estar lá (se o pacote mudar o texto, o teste acima passaria sem provar nada).
// Qualquer outro .js (entry, __common, runtime, chunk de rota) com o marcador é falha.
const comTanstack = js.filter((a) => readFileSync(a, 'utf8').includes(TANSTACK_NO_JS));
if (!comTanstack.some((a) => basename(a).startsWith('consultas-'))) {
  console.log(`FALHA controle positivo: "${TANSTACK_NO_JS}" não está em nenhum consultas-*.js`);
  falhas.push('Controle positivo do TanStack');
}
for (const arquivo of comTanstack.filter((a) => !basename(a).startsWith('consultas-'))) {
  console.log(
    `FALHA o TanStack Query está em ${nomeRel(arquivo)}; deveria estar só em consultas-*.js`,
  );
  falhas.push(`TanStack em ${nomeRel(arquivo)}`);
}
if (comTanstack.length > 0 && falhas.length === 0) {
  console.log(`ok    TanStack Query só em ${comTanstack.map(nomeRel).join(', ')}`);
}

if (falhas.length > 0) {
  console.error(`\nOrçamento estourado em ${falhas.length} item(ns).`);
  process.exit(1);
}
console.log('\nOrçamento respeitado.');
