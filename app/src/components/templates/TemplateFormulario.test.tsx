import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateFormulario } from './TemplateFormulario';

jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));

// O <Head> do expo-router só escreve no HTML estático; aqui ele guarda o que recebeu.
const mockHead: { filhos: unknown } = { filhos: null };
jest.mock('expo-router/head', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    mockHead.filhos = children;
    return null;
  },
}));

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

function tela(extra: Record<string, unknown> = {}) {
  return (
    <TemplateFormulario
      titulo="Cadastro de motorista"
      descricao="Seus dados e os do veículo. Leva cerca de um minuto."
      voltar={{ href: '/outra', rotulo: 'Voltar' }}
      {...extra}
    >
      <Text>cartão do formulário</Text>
    </TemplateFormulario>
  );
}

beforeEach(() => reiniciarCargaInicial());

describe('TemplateFormulario', () => {
  it('um banner, um main, um único h1 com a descrição, e o cartão', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(papel('banner')).toHaveLength(1);
    expect(papel('main')).toHaveLength(1);
    const titulos = screen.getAllByRole('heading');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.props['aria-level']).toBe(1);
    expect(screen.getByRole('heading', { name: 'Cadastro de motorista' })).toBeOnTheScreen();
    expect(
      screen.getByText('Seus dados e os do veículo. Leva cerca de um minuto.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('cartão do formulário')).toBeOnTheScreen();
  });

  it('é uma tela pública: cabeçalho simples, sem navegação nem barra de abas', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(papel('navigation')).toHaveLength(0);
  });

  it('o link "Voltar" é um link, vem antes do título e leva à tela anterior', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    const voltar = screen.getByRole('link', { name: 'Voltar' });
    expect(voltar).toBeOnTheScreen();
    const textos = screen.getAllByText(/Voltar|Cadastro de motorista/).map((t) => t.props.children);
    expect(textos).toEqual(['Voltar', 'Cadastro de motorista']);
  });

  it('sem "voltar" não há link', async () => {
    await renderizarComRota(tela({ voltar: undefined }), { rotas: ['outra'] });
    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeOnTheScreen();
  });

  it('a página é estreita: até 760 px', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    const miolo = screen.getByRole('heading').parent?.parent?.parent;
    expect(StyleSheet.flatten(miolo?.props.style).maxWidth).toBe(760);
  });
});
