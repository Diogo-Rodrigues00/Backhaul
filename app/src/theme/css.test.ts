import { gerarCssGlobal } from './css';
import { breakpoints, colors } from './tokens';
import { achatar } from './variaveis';

const css = gerarCssGlobal();

/** Corpo `{...}` da primeira regra que começa com o seletor dado (sem chaves aninhadas). */
function corpo(seletor: string): string {
  const inicio = css.indexOf(seletor);
  expect(inicio).toBeGreaterThanOrEqual(0);
  const abre = css.indexOf('{', inicio);
  return css.slice(abre + 1, css.indexOf('}', abre));
}

describe('gerarCssGlobal', () => {
  it('declara todas as variáveis do tema claro em :root', () => {
    const regra = corpo(':root{');
    for (const [nome, valor] of achatar(colors.light)) {
      expect(regra).toContain(`${nome}:${valor}`);
    }
    expect(regra).toContain('--bg-page:#EDEFF2');
    expect(regra).toContain('--text-on-inverse:#F4F6F8');
    expect(regra).toContain('--urgency-critico-bg:#C42B1C');
  });

  it('segue o sistema no escuro, exceto quando o claro foi forçado', () => {
    const inicio = css.indexOf(
      '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){',
    );
    expect(inicio).toBeGreaterThanOrEqual(0);
    const regra = css.slice(inicio, css.indexOf('}}', inicio));
    for (const [nome, valor] of achatar(colors.dark)) {
      expect(regra).toContain(`${nome}:${valor}`);
    }
    expect(regra).toContain('--bg-page:#0E1216');
  });

  it('força o escuro com data-theme="dark"', () => {
    const regra = corpo(':root[data-theme="dark"]{');
    for (const [nome, valor] of achatar(colors.dark)) {
      expect(regra).toContain(`${nome}:${valor}`);
    }
  });

  it('nomeia as variáveis em kebab-case com o caminho do papel', () => {
    const nomes = achatar(colors.light).map(([nome]) => nome);
    expect(nomes).toContain('--focus-ring-on-inverse');
    expect(nomes).toContain('--urgency-normal-border');
    expect(nomes).toContain('--action-fill-pressed');
    expect(nomes).toHaveLength(achatar(colors.dark).length);
  });

  it('gera as sombras dos dois temas', () => {
    expect(css).toContain('--shadow-card:0 1px 0 rgba(20,24,29,0.08),0 2px 6px rgba(20,24,29,0.1)');
    expect(css).toContain('--shadow-dialog:0 14px 36px rgba(20,24,29,0.3)');
    expect(css).toContain('--shadow-card:none');
    expect(css).toContain('--shadow-dialog:0 18px 40px rgba(0,0,0,0.65)');
  });

  it('hospeda a Barlow 500 e 700 no próprio site com font-display optional', () => {
    expect(css).toContain(
      'font-weight:500;font-display:optional;src:url("/fontes/barlow-latin-500.woff2")',
    );
    expect(css).toContain(
      'font-weight:700;font-display:optional;src:url("/fontes/barlow-latin-700.woff2")',
    );
    expect(css.match(/@font-face/g)).toHaveLength(2);
    expect(css).not.toMatch(/googleapis|gstatic/);
  });

  it('esconde por largura com data-bp, sem JavaScript', () => {
    expect(css).toContain(
      `@media (min-width:${breakpoints.phone + 1}px){[data-bp="so-celular"]{display:none!important}}`,
    );
    expect(css).toContain(
      `@media (max-width:${breakpoints.phone}px){[data-bp="sem-celular"]{display:none!important}}`,
    );
    for (const nome of ['compacto', 'barra', 'largo']) {
      expect(css).toContain(`[data-bp="so-${nome}"]`);
      expect(css).toContain(`[data-bp="sem-${nome}"]`);
    }
  });

  it('inclui números tabulares, scroll-padding da barra inferior e movimento reduzido', () => {
    expect(css).toContain('[data-num]{font-variant-numeric:tabular-nums}');
    expect(css).toContain(
      `@media (max-width:${breakpoints.tabbar}px){html{scroll-padding-bottom:72px}}`,
    );
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('foco visível global usa o token focus.ring', () => {
    expect(css).toContain(':focus-visible{outline:3px solid var(--focus-ring);outline-offset:2px}');
  });

  it('pinta fundo e texto desde o HTML estático e deixa o body rolar', () => {
    expect(css).toContain('html,body{background-color:var(--bg-page);color:var(--text-primary)');
    expect(css).toContain('body{overflow:auto}');
  });
});
