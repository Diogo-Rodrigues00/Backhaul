// Gera public/fontes/barlow-latin-{500,700}.woff2 a partir do @fontsource/barlow (OFL).
// Os arquivos gerados FICAM NO GIT: este script só roda quando o subconjunto precisar mudar.
//
// Por que subconjunto: o "latin" do Fontsource tem ~22 KB por peso (44 KB juntos); o orçamento
// do ADR 0011 é 40 KB. Só português (ASCII, Latin-1, aspas, travessões, reticências, euro) cabe em ~25 KB.
//
// Requisitos: Python com `pip install fonttools brotli` (comando `pyftsubset` no PATH).
// Uso: node scripts/gerar-fontes.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = (peso) =>
  join(raiz, `node_modules/@fontsource/barlow/files/barlow-latin-${peso}-normal.woff2`);
const destino = (peso) => join(raiz, `public/fontes/barlow-latin-${peso}.woff2`);

const unicodes = [
  'U+0020-007E', // ASCII
  'U+00A0-00FF', // Latin-1 (acentos do português)
  'U+0152-0153',
  'U+2013-2014', // travessões
  'U+2018-201A',
  'U+201C-201E', // aspas
  'U+2022', // marcador
  'U+2026', // reticências
  'U+20AC', // euro
  'U+2122',
  'U+2212', // sinal de menos
].join(',');

mkdirSync(join(raiz, 'public/fontes'), { recursive: true });

for (const peso of [500, 700]) {
  const r = spawnSync(
    'pyftsubset',
    [
      origem(peso),
      `--unicodes=${unicodes}`,
      '--flavor=woff2',
      // kern/ligaduras/acentos e os numerais tabulares (tnum) usados por [data-num].
      '--layout-features=kern,liga,ccmp,locl,mark,mkmk,tnum,pnum',
      '--no-hinting',
      '--desubroutinize',
      `--output-file=${destino(peso)}`,
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (r.status !== 0) {
    console.error('pyftsubset falhou. Instale com: pip install fonttools brotli');
    process.exit(r.status ?? 1);
  }
  console.log(`gerado ${destino(peso)}`);
}
