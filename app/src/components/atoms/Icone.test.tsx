import { screen } from '@testing-library/react-native';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelRatio } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { Desenho as DesenhoWeb, Icone as IconeWeb } from './Icone.web';
import { Icone } from './Icone.native';
import { tamanhoEmEm, tamanhoEmPx } from './iconeComum';
import { icones, type NomeIcone } from './icones';
import { simbolo, VIEWBOX_SIMBOLO } from './simbolo';

// Lista da seção 4 do design-system.md. Ícone novo exige aprovação do designer.
const ICONES_DO_DS = [
  'triangle-alert',
  'octagon-alert',
  'circle',
  'map-pin',
  'locate',
  'truck',
  'package',
  'clock',
  'shield-check',
  'check',
  'x',
  'plus',
  'refresh',
  'sun',
  'moon',
  'log-out',
  'arrow-right',
  'arrow-left',
  'building',
  'info',
  'loader',
  'bell',
  'banknote',
  'search',
  'server',
  'user',
  'file',
  'flask',
  'inbox',
  'lock',
  'send',
  'wifi-off',
];

function svgDoIcone() {
  const [svg] = screen.container.queryAll((el) => el.type === 'RNSVGSvgView');
  if (!svg) throw new Error('Nenhum <Svg> renderizado');
  return svg;
}

afterEach(() => jest.restoreAllMocks());

describe('icones.ts', () => {
  it('tem exatamente os ícones da seção 4 do design system', () => {
    expect(Object.keys(icones).sort()).toEqual([...ICONES_DO_DS].sort());
  });

  it('cada ícone tem pelo menos uma forma válida', () => {
    for (const nome of Object.keys(icones) as NomeIcone[]) {
      expect(icones[nome].length).toBeGreaterThan(0);
      for (const [tag, atributos] of icones[nome]) {
        expect(['path', 'circle', 'rect', 'line', 'polyline']).toContain(tag);
        expect(Object.keys(atributos).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('tamanhos', () => {
  it('padrão = 1,25 em e destaque = 1,75 em do corpo de 17 px', () => {
    expect(tamanhoEmEm('padrao')).toBe('1.25em');
    expect(tamanhoEmEm('destaque')).toBe('1.75em');
    expect(tamanhoEmPx('padrao')).toBe(21);
    expect(tamanhoEmPx('destaque')).toBe(30);
  });

  it('número é px exato, sem escala', () => {
    expect(tamanhoEmEm(44)).toBe(44);
    expect(tamanhoEmPx(44, 2)).toBe(44);
  });

  it('a escala do Dynamic Type cresce o ícone de tamanho relativo', () => {
    expect(tamanhoEmPx('padrao', 2)).toBe(43); // 21,25 x 2 = 42,5
  });
});

describe('Icone (iPhone, react-native-svg)', () => {
  it('é decorativo por padrão: fora da árvore de acessibilidade', async () => {
    await renderizar(<Icone nome="check" />);
    const svg = svgDoIcone();
    expect(svg.props.accessible).toBe(false);
    expect(svg.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('com rotulo vira imagem com nome acessível', async () => {
    await renderizar(<Icone nome="sun" rotulo="Tema claro" />);
    expect(screen.getByRole('image', { name: 'Tema claro' })).toBeOnTheScreen();
  });

  it('usa text.primary por padrão e a cor passada quando houver', async () => {
    await renderizar(<Icone nome="check" />);
    expect(svgDoIcone().props.stroke).toBe(colors.light.text.primary);
    await screen.unmount();
    await renderizar(<Icone nome="check" cor={colors.light.success.text} />);
    expect(svgDoIcone().props.stroke).toBe(colors.light.success.text);
  });

  it('traço de 2 px, grade 24 e tamanho padrão de 21 px (fonte em 1x)', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1);
    await renderizar(<Icone nome="check" />);
    const { props } = svgDoIcone();
    expect(props).toMatchObject({ strokeWidth: 2, vbWidth: 24, vbHeight: 24, width: 21 });
  });

  it('acompanha o Dynamic Type até 2x', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(3); // acima do teto: vale 2x
    await renderizar(<Icone nome="check" />);
    expect(svgDoIcone().props.width).toBe(43);
  });

  it('desenha todas as formas do ícone', async () => {
    await renderizar(<Icone nome="locate" />);
    const formas = screen.container.queryAll(
      (el) =>
        typeof el.type === 'string' && /^RNSVG(Path|Circle|Rect|Line|Polyline)$/.test(el.type),
    );
    expect(formas).toHaveLength(icones.locate.length);
  });
});

describe('Icone (web, <svg>)', () => {
  function html(ui: React.ReactElement) {
    return renderToStaticMarkup(ui);
  }

  it('decorativo: aria-hidden, sem foco e herdando a cor do texto', () => {
    const saida = html(<IconeWeb nome="check" />);
    expect(saida).toContain('aria-hidden="true"');
    expect(saida).toContain('focusable="false"');
    expect(saida).toContain('stroke="currentColor"');
    expect(saida).toContain('width="1.25em"');
    expect(saida).not.toContain('role=');
  });

  it('com rotulo vira role="img" com aria-label, sem aria-hidden', () => {
    const saida = html(<IconeWeb nome="sun" rotulo="Tema claro" />);
    expect(saida).toContain('role="img"');
    expect(saida).toContain('aria-label="Tema claro"');
    expect(saida).not.toContain('aria-hidden');
  });

  it('cor vira `color` do estilo (o traço usa currentColor)', () => {
    const saida = html(<IconeWeb nome="check" cor="var(--success-text)" />);
    expect(saida).toContain('color:var(--success-text)');
  });

  it('desenha os paths do ícone em um <svg> 24x24 de traço 2', () => {
    const saida = html(<IconeWeb nome="check" tamanho="destaque" />);
    expect(saida).toContain('viewBox="0 0 24 24"');
    expect(saida).toContain('stroke-width="2"');
    expect(saida).toContain('width="1.75em"');
    expect(saida).toContain('<path d="M20 6 9 17l-5-5"');
  });

  it('Desenho aceita outra grade (símbolo da marca)', () => {
    const saida = html(<DesenhoWeb formas={simbolo} viewBox={VIEWBOX_SIMBOLO} tamanho={40} />);
    expect(saida).toContain('viewBox="0 0 48 48"');
    expect(saida).toContain('width="40"');
  });
});

describe('simbolo', () => {
  it('usa só as cores da marca (brand) e três formas', () => {
    expect(simbolo).toHaveLength(3);
    const cores = simbolo.flatMap(([, a]) => [a.fill, a.stroke]).filter(Boolean);
    expect(new Set(cores)).toEqual(new Set(['#FFB300', '#14181D']));
  });
});
