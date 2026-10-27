import { screen } from '@testing-library/react-native';
import { renderToStaticMarkup } from 'react-dom/server';

import { colors, brand } from '@/theme/tokens';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { corDoDivisor, medidasDivisor } from './divisorComum';
import { DivisorEstrada as DivisorWeb } from './DivisorEstrada.web';
import { DivisorEstrada } from './DivisorEstrada.native';

describe('divisorComum', () => {
  it('faixa âmbar do cabeçalho: 4 px, 28 de traço e 16 de vão', () => {
    expect(medidasDivisor('ambar', 3)).toEqual({ espessura: 4, tracejado: '28 16' });
  });

  it('separador cinza usa a borda forte do DS (3 px)', () => {
    expect(medidasDivisor('cinza', 3).espessura).toBe(3);
  });

  it('âmbar é a cor da marca nos dois temas; cinza é border.subtle', () => {
    expect(corDoDivisor(colors.light, 'ambar')).toBe(brand.amber);
    expect(corDoDivisor(colors.dark, 'ambar')).toBe(brand.amber);
    expect(corDoDivisor(colors.dark, 'cinza')).toBe(colors.dark.border.subtle);
  });
});

describe('DivisorEstrada (web)', () => {
  it('é decorativo: aria-hidden, sem foco', () => {
    const saida = renderToStaticMarkup(comTema(<DivisorWeb />));
    expect(saida).toContain('aria-hidden="true"');
    expect(saida).toContain('focusable="false"');
  });

  it('âmbar: linha tracejada 28/16 de 4 px', () => {
    const saida = renderToStaticMarkup(comTema(<DivisorWeb variante="ambar" />));
    expect(saida).toContain('stroke-dasharray="28 16"');
    expect(saida).toContain('height="4"');
  });
});

describe('DivisorEstrada (iPhone)', () => {
  it('é decorativo e desenha a linha tracejada', async () => {
    await renderizar(<DivisorEstrada variante="ambar" />);
    const [svg] = screen.container.queryAll((el) => el.type === 'RNSVGSvgView');
    expect(svg?.props.accessible).toBe(false);
    expect(svg?.props.importantForAccessibility).toBe('no-hide-descendants');
    const [linha] = screen.container.queryAll((el) => el.type === 'RNSVGLine');
    expect(linha?.props.strokeDasharray).toBeDefined();
    expect(linha?.props.stroke).toBeDefined();
  });
});
