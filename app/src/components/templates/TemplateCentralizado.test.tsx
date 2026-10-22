import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Cabecalho } from '@/components/organisms/Cabecalho';
import { moverFoco } from '@/lib/a11y';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateCentralizado } from './TemplateCentralizado';

// moverFoco usa findNodeHandle (sem efeito no renderer de teste): espiado para ver se foi chamado.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));

const mockHead: { filhos: unknown } = { filhos: null };
jest.mock('expo-router/head', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    mockHead.filhos = children;
    return null;
  },
}));

function tela(extra: { descricaoComoAlerta?: boolean } = {}) {
  return (
    <TemplateCentralizado
      titulo="Conectando ao servidor"
      descricao="Fique nesta tela."
      cabecalho={<Cabecalho variante="simples" />}
      ilustracao={<Text>ilustração</Text>}
      {...extra}
    >
      <Text>ação</Text>
    </TemplateCentralizado>
  );
}

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

beforeEach(() => jest.mocked(moverFoco).mockClear());

describe('TemplateCentralizado', () => {
  it('tem cabeçalho, uma região principal e um único h1 com a frase', async () => {
    await renderizarComRota(tela());

    expect(papel('banner')).toHaveLength(1);
    expect(papel('main')).toHaveLength(1);
    const titulo = screen.getByRole('heading', { name: 'Conectando ao servidor' });
    expect(titulo.props['aria-level']).toBe(1);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByText('Fique nesta tela.')).toBeOnTheScreen();
    expect(screen.getByText('ilustração')).toBeOnTheScreen();
    expect(screen.getByText('ação')).toBeOnTheScreen();
  });

  it('leva o foco ao h1 assim que aparece', async () => {
    await renderizarComRota(tela());
    expect(moverFoco).toHaveBeenCalledTimes(1);
    const titulo = screen.getByRole('heading', { name: 'Conectando ao servidor' });
    expect(titulo.props.tabIndex).toBe(-1);
  });

  it('a frase só vira role="alert" quando é um erro', async () => {
    await renderizarComRota(tela());
    expect(papel('alert')).toHaveLength(0);
  });

  it('com descricaoComoAlerta a frase é anunciada na hora', async () => {
    await renderizarComRota(tela({ descricaoComoAlerta: true }));
    expect(papel('alert')).toEqual([screen.getByText('Fique nesta tela.')]);
  });

  it('a coluna central tem no máximo 520 px e o texto é centralizado', async () => {
    await renderizarComRota(tela());
    const frase = screen.getByText('Fique nesta tela.');
    expect(StyleSheet.flatten(frase.props.style)).toMatchObject({ textAlign: 'center' });
    const colunas = screen.container.queryAll(
      (el) => StyleSheet.flatten(el.props.style)?.maxWidth === 520,
    );
    expect(colunas.length).toBeGreaterThan(0);
  });

  it('põe o título e a descrição no <head> da página', async () => {
    await renderizarComRota(tela());
    const filhos = ([] as { type: string; props: Record<string, unknown> }[]).concat(
      mockHead.filhos as never,
    );
    expect(filhos.find((el) => el.type === 'title')?.props.children).toBe(
      'Conectando ao servidor · Backhaul',
    );
    expect(filhos.find((el) => el.type === 'meta')?.props.content).toBe('Fique nesta tela.');
  });
});
