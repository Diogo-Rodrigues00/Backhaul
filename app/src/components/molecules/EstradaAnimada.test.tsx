import { screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { renderizar } from '@/test-utils/renderComTema';

import { EstradaAnimada } from './EstradaAnimada';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));

const reduzido = useMovimentoReduzido as jest.MockedFunction<typeof useMovimentoReduzido>;

let iniciar: jest.Mock;
let parar: jest.Mock;

beforeEach(() => {
  reduzido.mockReturnValue(false);
  iniciar = jest.fn();
  parar = jest.fn();
  jest.spyOn(Animated, 'loop').mockReturnValue({ start: iniciar, stop: parar } as never);
});

afterEach(() => jest.restoreAllMocks());

describe('EstradaAnimada', () => {
  it('é só decoração: escondida da leitura, sem texto', async () => {
    await renderizar(<EstradaAnimada />);
    const escondidos = screen.container.queryAll((el) => el.props['aria-hidden'] === true);
    expect(escondidos.length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('anima a faixa e o caminhão (um só laço)', async () => {
    await renderizar(<EstradaAnimada />);
    expect(Animated.loop).toHaveBeenCalledTimes(1);
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('fica parada com movimento reduzido', async () => {
    reduzido.mockReturnValue(true);
    await renderizar(<EstradaAnimada />);
    expect(Animated.loop).not.toHaveBeenCalled();
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('para a animação ao sair da tela', async () => {
    const { unmount } = await renderizar(<EstradaAnimada />);
    await unmount();
    expect(parar).toHaveBeenCalled();
  });
});
