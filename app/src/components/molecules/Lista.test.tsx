import { screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { Lista } from './Lista';

const cargas = [
  { id: 'a', nome: 'Soja' },
  { id: 'b', nome: 'Milho' },
];

describe('Lista', () => {
  it('é uma lista com nome e um item por elemento, na ordem recebida', async () => {
    await renderizar(
      <Lista
        rotulo="Cargas próximas"
        itens={cargas}
        chave={(c) => c.id}
        renderizarItem={(c) => <Text>{c.nome}</Text>}
      />,
    );
    const lista = screen.container.queryAll((el) => el.props.role === 'list')[0];
    expect(lista?.props['aria-label']).toBe('Cargas próximas');
    const itens = screen.container.queryAll((el) => el.props.role === 'listitem');
    expect(itens).toHaveLength(2);
    expect(within(itens[0]!).getByText('Soja')).toBeOnTheScreen();
    expect(within(itens[1]!).getByText('Milho')).toBeOnTheScreen();
  });

  it('entrega o índice a quem desenha o item', async () => {
    await renderizar(
      <Lista
        rotulo="Cargas"
        itens={cargas}
        chave={(c) => c.id}
        renderizarItem={(c, i) => <Text>{`${i + 1}. ${c.nome}`}</Text>}
      />,
    );
    expect(screen.getByText('2. Milho')).toBeOnTheScreen();
  });

  it('lista vazia não gera itens', async () => {
    await renderizar(
      <Lista
        rotulo="Cargas"
        itens={[] as typeof cargas}
        chave={(c) => c.id}
        renderizarItem={(c) => <Text>{c.nome}</Text>}
      />,
    );
    expect(screen.container.queryAll((el) => el.props.role === 'listitem')).toHaveLength(0);
  });
});
