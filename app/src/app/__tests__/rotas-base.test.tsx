import { renderRouter, screen } from 'expo-router/testing-library';

import NaoEncontrada from '../+not-found';
import LayoutRaiz from '../_layout';
import Inicio from '../index';

describe('rotas da base', () => {
  it('/ tem um único heading nível 1 "Bem-vindo ao Backhaul" e a região principal', async () => {
    // No RNTL 14 o render é assíncrono: renderRouter devolve uma Promise.
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    const titulo = screen.getByRole('heading', { name: 'Bem-vindo ao Backhaul' });
    expect(titulo.props['aria-level']).toBe(1);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    // View não é elemento de acessibilidade para o RNTL, então getByRole não enxerga landmarks.
    expect(screen.container.queryAll((el) => el.props.role === 'main')).toHaveLength(1);
    expect(screen.container.queryAll((el) => el.props.role === 'banner')).toHaveLength(1);
    // Tela pública: cabeçalho simples, sem navegação.
    expect(screen.container.queryAll((el) => el.props.role === 'navigation')).toHaveLength(0);
    expect(
      screen.getByText(
        'Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.',
      ),
    ).toBeOnTheScreen();
  });

  it('o layout monta uma única região viva (anunciar() chega a ela sem mover o foco)', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    const regioes = screen.container.queryAll(
      (el) => el.props.role === 'status' && el.props['aria-live'] === 'polite',
    );
    expect(regioes).toHaveLength(1);
  });

  it('+not-found tem heading e link para /', async () => {
    await renderRouter(
      { _layout: LayoutRaiz, index: Inicio, '+not-found': NaoEncontrada },
      { initialUrl: '/nao-existe' },
    );

    const titulo = screen.getByRole('heading', { name: 'Página não encontrada' });
    expect(titulo.props['aria-level']).toBe(1);
    const link = screen.getByRole('link', { name: 'Voltar para o início' });
    expect(link.props.href).toBe('/');
    expect(screen.container.queryAll((el) => el.props.role === 'main')).toHaveLength(1);
    expect(screen.container.queryAll((el) => el.props.role === 'banner')).toHaveLength(1);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });
});
