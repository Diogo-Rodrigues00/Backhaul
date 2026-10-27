import { screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';
import { brand } from '@/theme/tokens';

import { AbaNavegacao } from './AbaNavegacao';

const rotas = ['empresa/cargas'];

describe('AbaNavegacao', () => {
  it('é um link com o rótulo como nome e o href do destino', async () => {
    await renderizarComRota(
      <AbaNavegacao
        href="/empresa/cargas"
        rotulo="Minhas cargas"
        icone="package"
        atual={false}
        variante="cabecalho"
      />,
      { rotas },
    );
    const link = screen.getByRole('link', { name: 'Minhas cargas' });
    expect(link.props.href).toBe('/empresa/cargas');
  });

  it('a página atual leva aria-current="page"; as outras não', async () => {
    await renderizarComRota(
      <>
        <AbaNavegacao
          href="/empresa/cargas"
          rotulo="Minhas cargas"
          icone="package"
          atual
          variante="cabecalho"
        />
        <AbaNavegacao href="/" rotulo="Início" icone="truck" atual={false} variante="cabecalho" />
      </>,
      { rotas },
    );
    expect(screen.getByRole('link', { name: 'Minhas cargas' }).props['aria-current']).toBe('page');
    expect(screen.getByRole('link', { name: 'Início' }).props['aria-current']).toBeUndefined();
  });

  it('a atual não depende só da cor: a barra de 3 px (barra) ou 4 px (cabeçalho) acende', async () => {
    await renderizarComRota(
      <>
        <AbaNavegacao
          href="/empresa/cargas"
          rotulo="Cargas"
          icone="package"
          atual
          variante="barra"
        />
        <AbaNavegacao href="/" rotulo="Início" icone="truck" atual variante="cabecalho" />
      </>,
      { rotas },
    );
    const barra = StyleSheet.flatten(screen.getByRole('link', { name: 'Cargas' }).props.style);
    expect(barra).toMatchObject({ borderTopWidth: 3, borderTopColor: brand.amber });
    const cabecalho = StyleSheet.flatten(screen.getByRole('link', { name: 'Início' }).props.style);
    expect(cabecalho).toMatchObject({ borderBottomWidth: 4, borderBottomColor: brand.amber });
  });

  it('na barra inferior o alvo tem 60 px ou mais e o rótulo continua visível', async () => {
    await renderizarComRota(
      <AbaNavegacao href="/" rotulo="Início" icone="truck" atual={false} variante="barra" />,
    );
    const estilo = StyleSheet.flatten(screen.getByRole('link', { name: 'Início' }).props.style);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(60);
    expect(screen.getByText('Início')).toBeOnTheScreen();
  });

  it('no cabeçalho o alvo tem 48 px ou mais', async () => {
    await renderizarComRota(
      <AbaNavegacao href="/" rotulo="Início" icone="truck" atual={false} variante="cabecalho" />,
    );
    const estilo = StyleSheet.flatten(screen.getByRole('link', { name: 'Início' }).props.style);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('no iPhone marca o item atual como selecionado para o VoiceOver', async () => {
    await renderizarComRota(
      <AbaNavegacao href="/" rotulo="Início" icone="truck" atual variante="barra" />,
    );
    expect(screen.getByRole('link', { name: 'Início' }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('na web não põe estado de seleção (aria-selected é inválido em link)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizarComRota(
      <AbaNavegacao href="/" rotulo="Início" icone="truck" atual variante="barra" />,
    );
    expect(
      screen.getByRole('link', { name: 'Início' }).props.accessibilityState?.selected,
    ).toBeUndefined();
    jest.restoreAllMocks();
  });
});
