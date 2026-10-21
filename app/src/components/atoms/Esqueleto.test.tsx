import { screen } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { renderizar } from '@/test-utils/renderComTema';

import { Esqueleto } from './Esqueleto';

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

describe('Esqueleto', () => {
  const blocos = (incluirOcultos = true) =>
    screen.queryAllByTestId('esqueleto-bloco', { includeHiddenElements: incluirOcultos });

  it('é decorativo: escondido da árvore de acessibilidade', async () => {
    await renderizar(<Esqueleto linhas={3} />);
    expect(blocos(false)).toHaveLength(0);
    expect(blocos(true)).toHaveLength(3);
  });

  it('simula N linhas e a última é mais curta', async () => {
    await renderizar(<Esqueleto linhas={3} />);
    const largura = (i: number) => StyleSheet.flatten(blocos()[i]?.props.style).width;
    expect(blocos()).toHaveLength(3);
    expect([largura(0), largura(1), largura(2)]).toEqual(['100%', '100%', '60%']);
  });

  it('com altura vira um único bloco (cartão, imagem)', async () => {
    await renderizar(<Esqueleto altura={80} largura={200} />);
    expect(blocos()).toHaveLength(1);
    expect(StyleSheet.flatten(blocos()[0]?.props.style).height).toBe(80);
  });

  it('pulsa quando o movimento não é reduzido', async () => {
    await renderizar(<Esqueleto />);
    expect(loop).toHaveBeenCalled();
  });

  it('fica parado com movimento reduzido (brilho desligado)', async () => {
    reduzido.mockReturnValue(true);
    await renderizar(<Esqueleto linhas={2} />);
    expect(loop).not.toHaveBeenCalled();
    expect(blocos()).toHaveLength(2);
  });
});
