import { screen, within } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import { BarraAbas } from './BarraAbas';

const itens = [
  { href: '/', rotulo: 'Início', icone: 'truck' },
  { href: '/empresa/cargas', rotulo: 'Minhas cargas', icone: 'package' },
] as const;
const rotas = ['empresa/cargas'];

function navegacoes() {
  return screen.container.queryAll((el) => el.props.role === 'navigation');
}

afterEach(() => jest.restoreAllMocks());

describe('BarraAbas', () => {
  it('é uma navegação com nome e um link por item, rótulo sempre visível', async () => {
    await renderizarComRota(<BarraAbas itens={itens} />, { rotas });
    const [nav] = navegacoes();
    expect(nav?.props['aria-label']).toBe('Principal');
    expect(within(nav!).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('Início')).toBeOnTheScreen();
    expect(screen.getByText('Minhas cargas')).toBeOnTheScreen();
  });

  it('marca a página aberta com aria-current="page"', async () => {
    await renderizarComRota(<BarraAbas itens={itens} />, { url: '/empresa/cargas', rotas });
    expect(screen.getByRole('link', { name: 'Minhas cargas' }).props['aria-current']).toBe('page');
    expect(screen.getByRole('link', { name: 'Início' }).props['aria-current']).toBeUndefined();
  });

  it('com destinos aninhados marca só o mais específico', async () => {
    const aninhados = [
      { href: '/empresa/cargas', rotulo: 'Minhas cargas', icone: 'package' },
      { href: '/empresa/cargas/nova', rotulo: 'Publicar carga', icone: 'plus' },
    ] as const;
    await renderizarComRota(<BarraAbas itens={aninhados} />, {
      url: '/empresa/cargas/nova',
      rotas: ['empresa/cargas/nova'],
    });
    expect(screen.getByRole('link', { name: 'Publicar carga' }).props['aria-current']).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Minhas cargas' }).props['aria-current'],
    ).toBeUndefined();
  });

  it('tem 60 px de altura', async () => {
    await renderizarComRota(<BarraAbas itens={itens} />);
    const lista = screen.container.queryAll((el) => el.props.role === 'list')[0];
    expect(StyleSheet.flatten(lista?.props.style).minHeight).toBe(60);
  });

  it('na web aparece só até 960 px por CSS, sem JavaScript (data-bp="so-barra"), e fica grudada', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizarComRota(<BarraAbas itens={itens} />);
    const [raiz] = screen.container.queryAll((el) => el.props.dataSet?.bp === 'so-barra');
    expect(raiz).toBeTruthy();
    expect(JSON.stringify(StyleSheet.flatten(raiz?.props.style))).toContain('sticky');
  });

  it('o foco usa o anel para fundo asfalto (data-anel)', async () => {
    await renderizarComRota(<BarraAbas itens={itens} />);
    const [comAnel] = screen.container.queryAll((el) => el.props.dataSet?.anel === 'inverso');
    expect(comAnel).toBeTruthy();
  });
});
