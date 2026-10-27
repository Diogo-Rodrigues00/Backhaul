import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { Preco } from './Preco';

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

describe('Preco (D-PO-12)', () => {
  it('formata como R$ 3.500,00 em destaque laranja e 30 px', async () => {
    await renderizar(<Preco valor={3500} />);
    const valor = screen.getByText('R$ 3.500,00');
    expect(estiloDe(valor)).toMatchObject({ fontSize: 30, color: colors.light.text.accent });
    expect(valor.props.dataSet).toEqual({ num: '' });
  });

  it('aceita o NUMERIC da API como texto', async () => {
    await renderizar(<Preco valor="3500.00" />);
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
  });

  it('expirado perde o destaque: usa text.secondary', async () => {
    await renderizar(<Preco valor={3500} expirado />);
    expect(estiloDe(screen.getByText('R$ 3.500,00')).color).toBe(colors.light.text.secondary);
  });

  it('mostra a legenda quando existe', async () => {
    await renderizar(<Preco valor={100} rotulo="Valor oferecido" />);
    expect(screen.getByText('Valor oferecido')).toBeOnTheScreen();
  });

  it('valor ausente vira traço, nunca "R$ NaN"', async () => {
    await renderizar(<Preco valor={undefined} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});
