import { screen } from '@testing-library/react-native';
import { renderToStaticMarkup } from 'react-dom/server';

import { brand } from '@/theme/tokens';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { FaixaDeObra as FaixaDeObraNativa } from './FaixaDeObra.native';
import { FaixaDeObra as FaixaDeObraWeb } from './FaixaDeObra.web';
import { ALTURA_FAIXA_OBRA, ALTURA_FAIXA_URGENTE } from './faixaComum';
import { FaixaUrgencia } from './FaixaUrgencia';

describe('FaixaUrgencia', () => {
  it('Normal não tem faixa', async () => {
    const { toJSON } = await renderizar(<FaixaUrgencia urgencia="normal" />);
    expect(toJSON()).toBeNull();
  });

  it('Urgente: faixa âmbar de 8 px, decorativa (aria-hidden)', async () => {
    await renderizar(<FaixaUrgencia urgencia="urgente" />);
    const [faixa] = screen.container.queryAll((el) => el.props['aria-hidden'] === true);
    expect(faixa).toBeDefined();
    expect(faixa?.props.style).toMatchObject({
      height: ALTURA_FAIXA_URGENTE,
      backgroundColor: brand.amber,
    });
    expect(ALTURA_FAIXA_URGENTE).toBe(8);
  });

  it('Crítico: faixa de obra de 12 px no iPhone (SVG), sem texto', async () => {
    const { toJSON } = await renderizar(<FaixaUrgencia urgencia="critico" />);
    expect(toJSON()).not.toBeNull();
    expect(ALTURA_FAIXA_OBRA).toBe(12);
    expect(screen.queryByText(/./)).toBeNull();
  });
});

describe('FaixaDeObra', () => {
  it('web: div decorativo de 12 px com as listras âmbar e asfalto (gradiente a 135°)', () => {
    const html = renderToStaticMarkup(comTema(<FaixaDeObraWeb />));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('height:12px');
    expect(html).toContain('repeating-linear-gradient(135deg');
    expect(html).toContain('#FFB300');
    expect(html).toContain('#14181D');
  });

  it('iPhone: SVG de 12 px escondido do leitor de tela', async () => {
    await renderizar(<FaixaDeObraNativa />);
    const [svg] = screen.container.queryAll(
      (el) => el.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(svg).toBeDefined();
  });
});
