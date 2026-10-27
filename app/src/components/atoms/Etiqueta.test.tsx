import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { Etiqueta } from './Etiqueta';

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

describe('Etiqueta', () => {
  it.each(['neutro', 'ok', 'erro', 'info', 'novo', 'tracejada'] as const)(
    '%s sempre tem ícone + texto',
    async (variante) => {
      await renderizar(<Etiqueta variante={variante}>Aberta</Etiqueta>);
      expect(screen.getByText('Aberta')).toBeOnTheScreen();
      expect(screen.container.queryAll((el) => el.type === 'RNSVGSvgView')).toHaveLength(1);
    },
  );

  it('usa os papéis de cor da variante', async () => {
    await renderizar(<Etiqueta variante="ok">Aberta</Etiqueta>);
    const etiqueta = screen.getByText('Aberta').parent;
    expect(estiloDe(etiqueta as never)).toMatchObject({
      backgroundColor: colors.light.success.bg,
      borderColor: colors.light.success.text,
    });
    expect(estiloDe(screen.getByText('Aberta')).color).toBe(colors.light.success.text);
  });

  it('tracejada tem borda tracejada e fundo transparente', async () => {
    await renderizar(<Etiqueta variante="tracejada">Expirada</Etiqueta>);
    expect(estiloDe(screen.getByText('Expirada').parent as never)).toMatchObject({
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    });
  });

  it('o texto não é cortado: pode quebrar de linha (sem numberOfLines)', async () => {
    await renderizar(<Etiqueta>Pago, retido até a entrega</Etiqueta>);
    expect(screen.getByText('Pago, retido até a entrega').props.numberOfLines).toBeUndefined();
  });
});
