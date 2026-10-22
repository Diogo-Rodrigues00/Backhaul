import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { moverFoco } from '@/lib/a11y';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateAutenticacao } from './TemplateAutenticacao';

jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));
const moverFocoMock = jest.mocked(moverFoco);

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
    <TemplateAutenticacao
      titulo="Entrar"
      descricao="Use o e-mail e a senha da sua conta."
      {...extra}
    >
      <Text>cartão do formulário</Text>
    </TemplateAutenticacao>
  );
}

beforeEach(() => {
  reiniciarCargaInicial();
  moverFocoMock.mockClear();
});

describe('TemplateAutenticacao', () => {
  it('um banner, um main, um único h1 com a descrição, e o formulário', async () => {
    await renderizarComRota(tela());
    expect(papel('banner')).toHaveLength(1);
    expect(papel('main')).toHaveLength(1);
    const titulos = screen.getAllByRole('heading');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.props['aria-level']).toBe(1);
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByText('Use o e-mail e a senha da sua conta.')).toBeOnTheScreen();
    expect(screen.getByText('cartão do formulário')).toBeOnTheScreen();
  });

  it('é uma tela pública: cabeçalho simples, sem navegação nem barra de abas', async () => {
    await renderizarComRota(tela());
    expect(papel('navigation')).toHaveLength(0);
  });

  it('o painel da marca é decorativo: fora da árvore de acessibilidade e sem segundo título', async () => {
    await renderizarComRota(tela());
    const escondidos = screen.container.queryAll(
      (el) =>
        el.props['aria-hidden'] === true &&
        el.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(escondidos).toHaveLength(1);
    // A chamada do painel existe no texto, mas dentro do trecho escondido.
    expect(screen.getByText(/A urgência decide/, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('o aviso vem antes do título', async () => {
    await renderizarComRota(tela({ aviso: <Text>Sua sessão expirou.</Text> }));
    const textos = screen.getAllByText(/Sua sessão expirou\.|Entrar/).map((t) => t.props.children);
    expect(textos).toEqual(['Sua sessão expirou.', 'Entrar']);
  });

  it('<title> é "{título} · Backhaul" e a meta description é a descrição', async () => {
    await renderizarComRota(tela());
    const filhos = ([] as { type: string; props: Record<string, unknown> }[]).concat(
      mockHead.filhos as never,
    );
    expect(filhos.find((el) => el.type === 'title')?.props.children).toBe('Entrar · Backhaul');
    expect(filhos.find((el) => el.type === 'meta')?.props).toMatchObject({
      name: 'description',
      content: 'Use o e-mail e a senha da sua conta.',
    });
  });

  it('o cartão tem no máximo 460 px e o painel e o cartão empilham por flex-wrap', async () => {
    await renderizarComRota(tela());
    const cartao = screen.getByRole('heading').parent?.parent;
    expect(StyleSheet.flatten(cartao?.props.style).maxWidth).toBe(460);
    const principal = papel('main')[0];
    expect(StyleSheet.flatten(principal?.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
    });
  });

  it('o foco vai ao h1 ao entrar por navegação, e não na carga inicial', async () => {
    await renderizarComRota(tela());
    expect(moverFocoMock).not.toHaveBeenCalled();
    await renderizarComRota(tela());
    expect(moverFocoMock).toHaveBeenCalledTimes(1);
  });
});
