// Gera os ícones do PWA a partir do símbolo do designer (docs/front/identidade/simbolo.svg).
// Uso: `node scripts/gerar-icones.mjs` (precisa do Chromium do Playwright: `npx playwright install chromium`).
// Trocar o logo = trocar o SVG e rodar de novo; nenhum código muda (ADR 0014).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');
const simbolo = readFileSync(resolve(raiz, '../docs/front/identidade/simbolo.svg'), 'utf8');
const saida = resolve(raiz, 'public/icones');
mkdirSync(saida, { recursive: true });

const ASFALTO = '#14181D'; // bg.inverse do design system

// fundo: cor opaca ou null (transparente). escala: fração do lado ocupada pelo símbolo.
const variantes = [
  { arquivo: 'icone-192.png', lado: 192, fundo: null, escala: 0.94 },
  { arquivo: 'icone-512.png', lado: 512, fundo: null, escala: 0.94 },
  // Maskable: o símbolo fica dentro da zona segura (círculo de 80% do lado).
  { arquivo: 'icone-512-maskable.png', lado: 512, fundo: ASFALTO, escala: 0.64 },
  // iOS preenche transparência com preto: precisa ser opaco.
  { arquivo: 'apple-touch-icon-180.png', lado: 180, fundo: ASFALTO, escala: 0.74 },
  // Para o favicon.ico.
  { arquivo: '../../.tmp-favicon-16.png', lado: 16, fundo: null, escala: 1 },
  { arquivo: '../../.tmp-favicon-32.png', lado: 32, fundo: null, escala: 1 },
  { arquivo: '../../.tmp-favicon-48.png', lado: 48, fundo: null, escala: 1 },
];

const svgInline = simbolo.replace('<svg ', '<svg width="100%" height="100%" ');
const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage();
  for (const v of variantes) {
    const lado = v.lado;
    const miolo = Math.round(lado * v.escala);
    await pagina.setViewportSize({ width: lado, height: lado });
    await pagina.setContent(
      `<style>html,body{margin:0;width:${lado}px;height:${lado}px;background:${v.fundo ?? 'transparent'}}
      .s{position:absolute;left:${(lado - miolo) / 2}px;top:${(lado - miolo) / 2}px;width:${miolo}px;height:${miolo}px}</style>
      <div class="s">${svgInline}</div>`,
    );
    await pagina.screenshot({ path: resolve(saida, v.arquivo), omitBackground: v.fundo === null });
  }
} finally {
  await navegador.close();
}

// favicon.ico com PNGs embutidos (16, 32, 48).
const tamanhos = [16, 32, 48];
const pngs = tamanhos.map((t) => readFileSync(resolve(raiz, `.tmp-favicon-${t}.png`)));
const cab = Buffer.alloc(6);
cab.writeUInt16LE(0, 0);
cab.writeUInt16LE(1, 2);
cab.writeUInt16LE(tamanhos.length, 4);
let deslocamento = 6 + 16 * tamanhos.length;
const entradas = tamanhos.map((t, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(t, 0);
  e.writeUInt8(t, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(deslocamento, 12);
  deslocamento += pngs[i].length;
  return e;
});
writeFileSync(resolve(raiz, 'public/favicon.ico'), Buffer.concat([cab, ...entradas, ...pngs]));

const { rmSync } = await import('node:fs');
for (const t of tamanhos) rmSync(resolve(raiz, `.tmp-favicon-${t}.png`));
console.log('Ícones gerados em public/icones e public/favicon.ico');
