import { fireEvent, screen } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';
import { colors } from '@/theme/tokens';

import { Link } from './Link';
import { Logo } from './Logo';

// Os atoms leem o tema por contexto; o layout de teste o fornece (sem ler o armazenamento).
function LayoutComTema({ children }: { children?: ReactNode }) {
  return (
    <TemaContext.Provider
      value={{
        ...montarTema('light'),
        preferencia: 'sistema',
        esquema: 'light',
        alternar: () => {},
        pronto: true,
      }}
    >
      {children}
    </TemaContext.Provider>
  );
}

function Layout() {
  return (
    <LayoutComTema>
      <Slot />
    </LayoutComTema>
  );
}

function Outra() {
  return <Text>Página de destino</Text>;
}

describe('Link', () => {
  it('é um link com href e o texto como nome acessível', async () => {
    await renderRouter(
      { _layout: Layout, index: () => <Link href="/outra">Criar conta</Link>, outra: Outra },
      { initialUrl: '/' },
    );
    const link = screen.getByRole('link', { name: 'Criar conta' });
    expect(link.props.href).toBe('/outra');
  });

  it('é sublinhado (cor nunca é o único sinal) e usa text.link', async () => {
    await renderRouter(
      { _layout: Layout, index: () => <Link href="/outra">Criar conta</Link> },
      { initialUrl: '/' },
    );
    const texto = screen.getByText('Criar conta');
    const estilo = StyleSheet.flatten(texto.props.style);
    expect(estilo).toMatchObject({
      textDecorationLine: 'underline',
      color: colors.light.text.link,
    });
  });

  it('o alvo nunca fica abaixo de 24 px', async () => {
    await renderRouter(
      { _layout: Layout, index: () => <Link href="/outra">Ver</Link> },
      { initialUrl: '/' },
    );
    const link = screen.getByRole('link', { name: 'Ver' });
    expect(StyleSheet.flatten(link.props.style).minHeight).toBe(24);
  });

  it('navega para a rota ao tocar', async () => {
    await renderRouter(
      { _layout: Layout, index: () => <Link href="/outra">Ir</Link>, outra: Outra },
      { initialUrl: '/' },
    );
    await fireEvent.press(screen.getByRole('link', { name: 'Ir' }));
    expect(await screen.findByText('Página de destino')).toBeOnTheScreen();
  });

  it('variante botao é um link com cara de Botao, 48 px', async () => {
    await renderRouter(
      {
        _layout: Layout,
        index: () => (
          <Link href="/outra" variante="botao" aparencia={{ variante: 'primario', icone: 'plus' }}>
            Criar conta
          </Link>
        ),
        outra: Outra,
      },
      { initialUrl: '/' },
    );
    const link = screen.getByRole('link', { name: 'Criar conta' });
    expect(link.props.href).toBe('/outra');
    expect(StyleSheet.flatten(link.props.style).minHeight).toBe(48);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Logo', () => {
  it('é o link "Backhaul, início" para a tela inicial', async () => {
    await renderRouter(
      { _layout: Layout, index: () => <Logo />, outra: Outra },
      { initialUrl: '/' },
    );
    const logo = screen.getByRole('link', { name: 'Backhaul, início' });
    expect(logo.props.href).toBe('/');
  });

  it('horizontal mostra o nome; símbolo mostra só o desenho', async () => {
    await renderRouter({ _layout: Layout, index: () => <Logo /> }, { initialUrl: '/' });
    expect(screen.getByText('Backhaul')).toBeOnTheScreen();
    await screen.unmount();

    await renderRouter(
      { _layout: Layout, index: () => <Logo variante="simbolo" /> },
      { initialUrl: '/' },
    );
    expect(screen.queryByText('Backhaul')).toBeNull();
    expect(screen.getByRole('link', { name: 'Backhaul, início' })).toBeOnTheScreen();
  });

  it('o alvo tem pelo menos 44 px (cabeçalho)', async () => {
    await renderRouter({ _layout: Layout, index: () => <Logo /> }, { initialUrl: '/' });
    const logo = screen.getByRole('link', { name: 'Backhaul, início' });
    expect(StyleSheet.flatten(logo.props.style).minHeight).toBe(44);
  });
});
