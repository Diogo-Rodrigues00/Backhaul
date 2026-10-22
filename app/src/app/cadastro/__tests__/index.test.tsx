// Escolha do perfil no cadastro (card 016): "Sou motorista", "Sou empresa" e "Já tenho conta".
// O store de rotas do expo-router é global: o teste que navega fica por último no arquivo.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { criarClienteDeTeste } from '../../../../mocks/utils-teste';
import CadastroEscolha from '../index';

jest.mock('@/state/sessao/useSessao', () => ({
  useSessao: () => ({
    estado: 'anonimo',
    usuario: null,
    aviso: null,
    entrar: jest.fn(),
    sair: jest.fn(),
  }),
}));

// Não é `async`: o retorno do renderRouter guarda getPathname (um `async` o perderia).
function renderizarEscolha() {
  const cliente = criarClienteDeTeste();

  function Layout({ children }: { children?: ReactNode }) {
    return (
      <QueryClientProvider client={cliente}>
        <TemaContext.Provider value={valorDoTema('light')}>
          {children ?? <Slot />}
        </TemaContext.Provider>
      </QueryClientProvider>
    );
  }

  return renderRouter(
    {
      _layout: Layout,
      cadastro: CadastroEscolha,
      'cadastro/empresa': () => <Text>Cadastro de empresa</Text>,
      'cadastro/motorista': () => <Text>Cadastro de motorista</Text>,
      entrar: () => <Text>Entrar</Text>,
    } as Parameters<typeof renderRouter>[0],
    { initialUrl: '/cadastro' },
  );
}

async function aguardarEscolha() {
  jest.useRealTimers();
  await screen.findByRole('heading', { name: 'Criar conta' });
}

/** Destino (`href`) do link que mostra esse texto: o Pressable do expo-router guarda a rota. */
function destinoDoLink(texto: string): unknown {
  let no: { props: Record<string, unknown>; parent: unknown } | null = screen.getByText(texto);
  while (no !== null && no.props.href === undefined) {
    no = no.parent as typeof no;
  }
  return no?.props.href;
}

describe('Escolha do perfil no cadastro', () => {
  it('tem um único h1 "Criar conta" e as três ações: motorista, empresa e login', async () => {
    await renderizarEscolha();
    await aguardarEscolha();
    expect(screen.getByText('Escolha como você vai usar o Backhaul.')).toBeOnTheScreen();
    expect(screen.getByText('Sou motorista')).toBeOnTheScreen();
    expect(screen.getByText('Sou empresa')).toBeOnTheScreen();
    expect(screen.getByText('Já tenho conta')).toBeOnTheScreen();
  });

  it('cada escolha aponta para a rota certa (motorista: card 017; empresa: este card; login: card 015)', async () => {
    await renderizarEscolha();
    await aguardarEscolha();
    expect(destinoDoLink('Sou motorista')).toBe('/cadastro/motorista');
    expect(destinoDoLink('Sou empresa')).toBe('/cadastro/empresa');
    expect(destinoDoLink('Já tenho conta')).toBe('/entrar');
  });

  // Último teste do arquivo: navega e deixa o store em outra rota.
  it('"Sou empresa" abre o cadastro de empresa', async () => {
    const tela = renderizarEscolha();
    await tela;
    await aguardarEscolha();
    await fireEvent.press(screen.getByText('Sou empresa'));
    await waitFor(() => expect(tela.getPathname()).toBe('/cadastro/empresa'));
  });
});
