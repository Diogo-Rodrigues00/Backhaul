import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Platform } from 'react-native';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { TemaProvider } from '@/state/tema/TemaProvider';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { Cabecalho } from './Cabecalho';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: { tema: 'backhaul.tema' },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

const itens = [
  { href: '/', rotulo: 'Início', icone: 'truck' },
  { href: '/empresa/cargas', rotulo: 'Minhas cargas', icone: 'package' },
] as const;
const usuario = { nome: 'Transportes Silva', perfil: 'Empresa' };

function completo(aoSair = () => {}) {
  return <Cabecalho variante="completo" itens={itens} usuario={usuario} aoSair={aoSair} />;
}

const rotas = ['empresa/cargas'];

function landmarks(papel: string) {
  return screen.container.queryAll((el) => el.props.role === papel);
}

afterEach(() => jest.restoreAllMocks());

describe('Cabecalho simples', () => {
  it('é o banner da tela, com o logo e o botão de tema, sem navegação nem Sair', async () => {
    await renderizarComRota(<Cabecalho variante="simples" />);
    expect(landmarks('banner')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Backhaul, início' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Alternar tema/ })).toBeOnTheScreen();
    expect(landmarks('navigation')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
  });
});

describe('Cabecalho completo (web)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    // O Icone do Jest é o do iPhone, que não entende `var(--…)`; só o aviso do SVG, não o teste.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('tem uma navegação "Principal" com os itens, e o da página aberta leva aria-current', async () => {
    await renderizarComRota(completo(), { url: '/empresa/cargas', rotas });
    const [nav] = landmarks('navigation');
    expect(nav?.props['aria-label']).toBe('Principal');
    const atual = within(nav!).getByRole('link', { name: 'Minhas cargas' });
    expect(atual.props['aria-current']).toBe('page');
    expect(
      within(nav!).getByRole('link', { name: 'Início' }).props['aria-current'],
    ).toBeUndefined();
  });

  it('mostra o nome e o perfil de quem está logado', async () => {
    await renderizarComRota(completo());
    expect(screen.getByText('Transportes Silva')).toBeOnTheScreen();
    expect(screen.getByText('Empresa')).toBeOnTheScreen();
  });

  it('"Pular para o conteúdo" é o primeiro link e o primeiro foco', async () => {
    await renderizarComRota(completo());
    const links = screen.getAllByRole('link');
    expect(links[0]).toBe(screen.getByRole('link', { name: 'Pular para o conteúdo' }));
    expect(links[0]!.props.href).toBe('#conteudo');
  });

  it('a navegação do cabeçalho some até 960 px por CSS, sem JavaScript (data-bp)', async () => {
    await renderizarComRota(completo());
    const [nav] = landmarks('navigation');
    const envoltorio = screen.container.queryAll(
      (el) => el.props.dataSet?.bp === 'sem-barra' && within(el).queryAllByRole('link').length > 1,
    );
    expect(envoltorio.length).toBeGreaterThan(0);
    expect(nav).toBeTruthy();
  });

  it('Sair chama aoSair', async () => {
    const aoSair = jest.fn();
    await renderizarComRota(completo(aoSair));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('o foco do cabeçalho usa o anel para fundo asfalto (data-anel)', async () => {
    await renderizarComRota(completo());
    const [banner] = landmarks('banner');
    expect(banner?.props.dataSet).toEqual({ anel: 'inverso' });
  });
});

describe('Cabecalho completo (iPhone)', () => {
  it('numa janela estreita não monta a navegação: ficam logo, tema e Sair com nome acessível', async () => {
    await renderizarComRota(completo());
    expect(landmarks('navigation')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Backhaul, início' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Alternar tema/ })).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Pular para o conteúdo' })).toBeNull();
  });
});

describe('AlternarTema no cabeçalho (com o TemaProvider de verdade)', () => {
  it('cicla Sistema, Claro, Escuro e grava a escolha', async () => {
    await apagar(CHAVES.tema);
    jest.mocked(gravar).mockClear();
    function Layout() {
      return (
        <TemaProvider>
          <Slot />
        </TemaProvider>
      );
    }
    await renderRouter(
      { _layout: Layout, index: () => <Cabecalho variante="simples" /> },
      { initialUrl: '/' },
    );
    await act(async () => {});

    const alternar = () =>
      act(async () => fireEvent.press(screen.getByRole('button', { name: /Alternar tema/ })));

    expect(
      screen.getByRole('button', { name: 'Alternar tema. Atual: auto (segue o sistema)' }),
    ).toBeOnTheScreen();
    await alternar();
    expect(screen.getByRole('button', { name: 'Alternar tema. Atual: claro' })).toBeOnTheScreen();
    await alternar();
    expect(screen.getByRole('button', { name: 'Alternar tema. Atual: escuro' })).toBeOnTheScreen();
    expect(gravar).toHaveBeenLastCalledWith('backhaul.tema', 'dark');
    await alternar();
    expect(
      screen.getByRole('button', { name: 'Alternar tema. Atual: auto (segue o sistema)' }),
    ).toBeOnTheScreen();
  });
});
