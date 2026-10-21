import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { LinhaRota } from './LinhaRota';

// A largura da janela decide, no iPhone, quais peças aparecem (a web usa o CSS do dataSet).
let mockLargura = 750;
jest.mock('@/theme/responsivo', () => {
  const real = jest.requireActual('@/theme/responsivo');
  return { ...real, useLargura: () => mockLargura };
});

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

// Traço e quebra são os únicos elementos com `dataSet` de breakpoint dentro da rota.
function peca(bp: 'sem-compacto' | 'so-compacto') {
  return screen.container.queryAll((el) => el.props.dataSet?.bp === bp)[0];
}

function ocultoNoIphone(bp: 'sem-compacto' | 'so-compacto') {
  return estiloDe(peca(bp) as never).display === 'none';
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

  it('acima de 420 px: o traço aparece e a quebra não existe na linha', async () => {
    mockLargura = 750;
    await renderizar(<LinhaRota origem={origem} destino={destino} />);
    expect(ocultoNoIphone('sem-compacto')).toBe(false);
    expect(ocultoNoIphone('so-compacto')).toBe(true);
  });

  it.each([421, 430, 440, 480])(
    'em %i px (faixa dos celulares grandes) o traço continua na linha e a quebra fica oculta',
    async (largura) => {
      mockLargura = largura;
      await renderizar(<LinhaRota origem={origem} destino={destino} />);
      expect(ocultoNoIphone('sem-compacto')).toBe(false);
      expect(ocultoNoIphone('so-compacto')).toBe(true);
    },
  );

  it.each([420, 390, 360, 320])(
    'até %i px o traço some e a quebra força o destino para a linha de baixo',
    async (largura) => {
      mockLargura = largura;
      await renderizar(<LinhaRota origem={origem} destino={destino} />);
      expect(ocultoNoIphone('sem-compacto')).toBe(true);
      expect(ocultoNoIphone('so-compacto')).toBe(false);
    },
  );
});
