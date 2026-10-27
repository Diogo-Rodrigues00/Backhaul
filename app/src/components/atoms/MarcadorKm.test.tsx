import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { MarcadorKm } from './MarcadorKm';

describe('MarcadorKm', () => {
  it('mostra a frase completa, não só o número', async () => {
    await renderizar(<MarcadorKm km={12.4} />);
    expect(screen.getByText('12,4 km')).toBeOnTheScreen();
    expect(screen.getByText('até a coleta')).toBeOnTheScreen();
  });

  it('aceita texto numérico da API e complemento próprio', async () => {
    await renderizar(<MarcadorKm km="3.50" complemento="até a entrega" />);
    expect(screen.getByText('3,5 km')).toBeOnTheScreen();
    expect(screen.getByText('até a entrega')).toBeOnTheScreen();
  });

  it('sem distância válida não renderiza nada', async () => {
    await renderizar(<MarcadorKm km={null} />);
    expect(screen.queryByText('até a coleta')).toBeNull();
  });

  it('o número usa algarismos tabulares', async () => {
    await renderizar(<MarcadorKm km={12.4} />);
    expect(screen.getByText('12,4 km').props.dataSet).toEqual({ num: '' });
  });
});
