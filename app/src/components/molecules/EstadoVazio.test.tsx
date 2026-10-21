import { screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { EstadoVazio } from './EstadoVazio';

describe('EstadoVazio', () => {
  it('mostra o título como h2, a frase e a ação', async () => {
    await renderizar(
      <EstadoVazio
        titulo="Você ainda não publicou uma disponibilidade"
        descricao="Publique uma para ver cargas próximas."
        acao={
          <Pressable role="button">
            <Text>Publicar disponibilidade</Text>
          </Pressable>
        }
      />,
    );
    const titulo = screen.getByRole('heading', {
      name: 'Você ainda não publicou uma disponibilidade',
    });
    expect(titulo.props['aria-level']).toBe(2);
    expect(screen.getByText('Publique uma para ver cargas próximas.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Publicar disponibilidade' })).toBeOnTheScreen();
  });

  it('o ícone é decorativo (escondido do leitor de tela)', async () => {
    await renderizar(<EstadoVazio titulo="Vazio" descricao="Nada aqui." acao={<Text>Ir</Text>} />);
    const escondidos = screen.container.queryAll((el) => el.props['aria-hidden'] === true);
    expect(escondidos.length).toBeGreaterThan(0);
  });
});
