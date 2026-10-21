import { screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { Responsivo } from './Responsivo';

afterEach(() => jest.restoreAllMocks());

describe('Responsivo', () => {
  it('na web monta sempre e deixa o CSS esconder (data-bp)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(
      <>
        <Responsivo bp="so-barra">
          <Text>barra</Text>
        </Responsivo>
        <Responsivo bp="sem-barra">
          <Text>cabeçalho</Text>
        </Responsivo>
      </>,
    );
    expect(screen.getByText('barra')).toBeOnTheScreen();
    expect(screen.getByText('cabeçalho')).toBeOnTheScreen();
    const bps = screen.container
      .queryAll((el) => el.props.dataSet?.bp !== undefined)
      .map((el) => el.props.dataSet.bp);
    expect(bps).toEqual(['so-barra', 'sem-barra']);
  });

  it('no iPhone (janela de 750 px) só monta o que vale para a largura', async () => {
    await renderizar(
      <>
        <Responsivo bp="so-barra">
          <Text>barra</Text>
        </Responsivo>
        <Responsivo bp="sem-barra">
          <Text>cabeçalho</Text>
        </Responsivo>
      </>,
    );
    expect(screen.getByText('barra')).toBeOnTheScreen();
    expect(screen.queryByText('cabeçalho')).toBeNull();
  });
});
