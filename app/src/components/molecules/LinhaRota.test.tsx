import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { LinhaRota } from './LinhaRota';

// A largura da janela decide, no iPhone, se o traço aparece (a web usa o CSS do dataSet).
let mockLargura = 750;
jest.mock('@/theme/responsivo', () => {
  const real = jest.requireActual('@/theme/responsivo');
  return { ...real, useLargura: () => mockLargura };
});

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

const origem = 'Uberlândia - MG';
const destino = 'Uberaba - MG';

describe('LinhaRota', () => {
  beforeEach(() => {
    mockLargura = 750;
  });

  it('mostra "Coleta em" e "Entrega em" sempre, com os dois locais', async () => {
    await renderizar(<LinhaRota origem={origem} destino={destino} />);
    expect(screen.getByText('Coleta em')).toBeOnTheScreen();
    expect(screen.getByText('Entrega em')).toBeOnTheScreen();
    expect(screen.getByText(origem)).toBeOnTheScreen();
    expect(screen.getByText(destino)).toBeOnTheScreen();
  });

  it('a rota inteira tem um texto acessível único, em ordem', async () => {
    await renderizar(<LinhaRota origem={origem} destino={destino} />);
    expect(
      screen.getByLabelText('Coleta em Uberlândia - MG, entrega em Uberaba - MG'),
    ).toBeOnTheScreen();
  });

  it('acima de 420 px o traço aparece', async () => {
    mockLargura = 750;
    await renderizar(<LinhaRota origem={origem} destino={destino} />);
    const traco = screen.container.queryAll((el) => el.props.dataSet?.bp === 'sem-compacto')[0];
    expect(traco).toBeDefined();
    expect(estiloDe(traco as never).display).toBeUndefined();
  });

  it('em até 420 px o traço some (os pontos empilham)', async () => {
    mockLargura = 360;
    await renderizar(<LinhaRota origem={origem} destino={destino} />);
    const traco = screen.container.queryAll((el) => el.props.dataSet?.bp === 'sem-compacto')[0];
    expect(estiloDe(traco as never).display).toBe('none');
  });
});
