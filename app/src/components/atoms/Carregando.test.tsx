import { screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { renderizar } from '@/test-utils/renderComTema';

import { Carregando } from './Carregando';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));

const reduzido = useMovimentoReduzido as jest.MockedFunction<typeof useMovimentoReduzido>;

// A animação em si não roda no Jest: o que importa é se ela é (ou não) iniciada.
let loop: jest.SpyInstance;
let parar: jest.Mock;
let iniciar: jest.Mock;

beforeEach(() => {
  reduzido.mockReturnValue(false);
  iniciar = jest.fn();
  parar = jest.fn();
  loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start: iniciar, stop: parar } as never);
});

afterEach(() => jest.restoreAllMocks());

describe('Carregando', () => {
  it('sempre tem texto visível (nunca o spinner sozinho)', async () => {
    await renderizar(<Carregando texto="Carregando cargas…" />);
    expect(screen.getByText('Carregando cargas…')).toBeOnTheScreen();
  });

  it('é uma região de status educada e ocupada, sem mover o foco', async () => {
    await renderizar(<Carregando texto="Conectando…" />);
    // View não é elemento de acessibilidade para o RNTL: procura pelo papel, não por getByRole.
    const [regiao] = screen.container.queryAll((el) => el.props.role === 'status');
    expect(regiao?.props['aria-live']).toBe('polite');
    expect(regiao?.props['aria-busy']).toBe(true);
    expect(regiao?.props.focusable).toBeUndefined();
  });

  it('o ícone girando é decorativo (aria-hidden)', async () => {
    await renderizar(<Carregando texto="Carregando…" />);
    const [svg] = screen.container.queryAll((el) => el.type === 'RNSVGSvgView');
    expect(svg?.props.accessible).toBe(false);
  });

  it('pequeno e grande: o grande tem 44 px', async () => {
    await renderizar(<Carregando texto="Carregando…" tamanho="grande" />);
    const [svg] = screen.container.queryAll((el) => el.type === 'RNSVGSvgView');
    expect(svg?.props.width).toBe(44);
  });

  it('gira em loop quando o movimento não é reduzido', async () => {
    await renderizar(<Carregando texto="Carregando…" />);
    expect(loop).toHaveBeenCalled();
    expect(iniciar).toHaveBeenCalled();
  });

  it('para de girar com movimento reduzido e o texto continua', async () => {
    reduzido.mockReturnValue(true);
    await renderizar(<Carregando texto="Carregando…" />);
    expect(loop).not.toHaveBeenCalled();
    expect(screen.getByText('Carregando…')).toBeOnTheScreen();
  });

  it('interrompe a animação ao sair da tela', async () => {
    await renderizar(<Carregando texto="Carregando…" />);
    await screen.unmount();
    expect(parar).toHaveBeenCalled();
  });
});
