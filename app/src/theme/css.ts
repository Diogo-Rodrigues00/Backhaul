import { breakpoints, colors, fonts, shadow, type } from './tokens';
import { achatar } from './variaveis';

// Roda só no build estático (+html.tsx, em Node): não entra no bundle do navegador.

/** Altura da barra inferior (DS seção 8) mais uma folga para o anel de foco. */
const ALTURA_BARRA_INFERIOR = 60;
const FOLGA_FOCO = 12;

/** Nome em português de cada ponto de quebra, usado no `data-bp` (ver `responsivo.ts`). */
const NOMES_BP = {
  compact: 'compacto',
  phone: 'celular',
  tabbar: 'barra',
  wide: 'largo',
} as const satisfies Record<keyof typeof breakpoints, string>;

type Esquema = 'light' | 'dark';
type Camada = readonly [deslocamentoY: number, desfoque: number, opacidade: number];

function hexParaRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function camadasCss(cor: string, camadas: readonly Camada[]): string[] {
  const rgb = hexParaRgb(cor);
  return camadas.map(
    ([y, desfoque, opacidade]) =>
      `0 ${y}px ${desfoque === 0 ? '0' : `${desfoque}px`} rgba(${rgb},${opacidade})`,
  );
}

/** Sombras do DS 3.4 em texto CSS, derivadas de `shadow` (a cor e os números vêm dos tokens). */
function sombras(tema: Esquema): [string, string][] {
  const { card, dialog } = shadow[tema];
  const dialogo = camadasCss(dialog.shadowColor, [
    [dialog.shadowOffset.height, dialog.shadowRadius, dialog.shadowOpacity],
  ]).join(',');
  if (tema === 'dark') {
    // No escuro a hierarquia vem da borda e do tom da superfície.
    return [
      ['--shadow-card', 'none'],
      ['--shadow-dialog', dialogo],
    ];
  }
  // Claro: filete de 1 px mais a sombra suave do cartão.
  const cartao = [
    ...camadasCss(card.shadowColor, [[1, 0, 0.08]]),
    ...camadasCss(card.shadowColor, [
      [card.shadowOffset.height, card.shadowRadius, card.shadowOpacity],
    ]),
  ].join(',');
  return [
    ['--shadow-card', cartao],
    ['--shadow-dialog', dialogo],
  ];
}

function variaveisDoTema(tema: Esquema): string {
  return [...achatar(colors[tema]), ...sombras(tema)]
    .map(([nome, valor]) => `${nome}:${valor}`)
    .join(';');
}

function fonteFace(peso: 500 | 700): string {
  return (
    `@font-face{font-family:"Barlow";font-style:normal;font-weight:${peso};` +
    `font-display:optional;src:url("/fontes/barlow-latin-${peso}.woff2") format("woff2")}`
  );
}

/**
 * Título de tela (h1): 38/44 acima de 720 px e 30/36 até 720 px (DS 3.3). O `Titulo` de nível 1
 * leva `data-titulo="1"`; o !important vence o estilo em linha do react-native-web.
 */
function regraDoTituloDeTela(): string {
  const { size, line } = type['2xl'];
  return (
    `@media (max-width:${breakpoints.phone}px){[data-titulo="1"]{` +
    `font-size:${size / 16}rem!important;line-height:${line / 16}rem!important}}`
  );
}

/** `so-celular` some acima de 720 px; `sem-celular` some até 720 px. Sem JavaScript. */
function regrasDePontoDeQuebra(): string {
  return (Object.keys(breakpoints) as (keyof typeof breakpoints)[])
    .map((chave) => {
      const nome = NOMES_BP[chave];
      const largura = breakpoints[chave];
      return (
        `@media (max-width:${largura}px){[data-bp="sem-${nome}"]{display:none!important}}` +
        `@media (min-width:${largura + 1}px){[data-bp="so-${nome}"]{display:none!important}}`
      );
    })
    .join('\n');
}

/**
 * CSS global da web (ADR 0008): variáveis dos dois temas, fonte, pontos de quebra e ajustes de
 * acessibilidade. Vai em um `<style>` do +html.tsx, então a primeira pintura já usa o tema certo.
 */
export function gerarCssGlobal(): string {
  const claro = variaveisDoTema('light');
  const escuro = variaveisDoTema('dark');
  return [
    // Sem atributo = segue o sistema; data-theme força claro ou escuro.
    `:root{color-scheme:light;${claro}}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;${escuro}}}`,
    `:root[data-theme="dark"]{color-scheme:dark;${escuro}}`,
    fonteFace(500),
    fonteFace(700),
    // Fundo e texto já no HTML estático (sem piscar). O ScrollViewStyleReset prende o body com
    // overflow:hidden; aqui ele volta a rolar, senão telas altas (zoom 200%, 320 px) ficam cortadas.
    `html,body{background-color:var(--bg-page);color:var(--text-primary);font-family:${fonts.fallbackWeb}}`,
    'body{overflow:auto}',
    '#root{min-height:100%;height:auto}',
    // Foco visível global (DS seção 5: 3 px, afastado 3 px; campos refinam para 2 px). Só aparece
    // no teclado (:focus-visible), nunca no clique. Componentes refinam (ex.: ringOnInverse).
    ':focus-visible{outline:3px solid var(--focus-ring);outline-offset:3px}',
    '[data-num]{font-variant-numeric:tabular-nums}',
    regrasDePontoDeQuebra(),
    regraDoTituloDeTela(),
    `@media (max-width:${breakpoints.tabbar}px){html{scroll-padding-bottom:${ALTURA_BARRA_INFERIOR + FOLGA_FOCO}px}}`,
    '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}',
  ].join('\n');
}
