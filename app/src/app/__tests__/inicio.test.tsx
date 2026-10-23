// Página inicial pública (`/`): marca, frase do produto e as duas portas de entrada.
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { liberarPaginaInicial } from '@/lib/paginaInicial';

import LayoutRaiz from '../_layout';
import Inicio from '../index';

jest.mock('@/lib/paginaInicial', () => ({
  ...jest.requireActual('@/lib/paginaInicial'),
  liberarPaginaInicial: jest.fn(),
}));

// O <Head> do expo-router só escreve no HTML estático; aqui ele guarda o que recebeu.
const mockHead: { filhos: unknown } = { filhos: null };
jest.mock('expo-router/head', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    mockHead.filhos = children;
    return null;
  },
}));

function elementosDoHead(tipo: string) {
  const lista = Array.isArray(mockHead.filhos) ? mockHead.filhos : [mockHead.filhos];
  return (lista as { type?: string; props: { children?: unknown; content?: string } }[]).filter(
    (el) => el?.type === tipo,
  );
}

beforeEach(() => {
  mockHead.filhos = null;
  jest.mocked(liberarPaginaInicial).mockClear();
});

describe('página inicial', () => {
  it('um único h1, a frase do produto, a descrição e a marca', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    const titulos = screen.getAllByRole('heading');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.props['aria-level']).toBe(1);
    expect(
      screen.getByRole('heading', { name: 'A urgência decide quem sai na frente' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.',
      ),
    ).toBeOnTheScreen();
    // A marca está no cabeçalho (o h1 é a frase do produto, a mesma do painel do login).
    expect(screen.getByRole('link', { name: /Backhaul/ })).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'main')).toHaveLength(1);
    expect(screen.container.queryAll((el) => el.props.role === 'banner')).toHaveLength(1);
  });

  it('"Entrar" leva a /entrar e "Criar conta" a /cadastro', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    expect(screen.getByRole('link', { name: 'Entrar' }).props.href).toBe('/entrar');
    expect(screen.getByRole('link', { name: 'Criar conta' }).props.href).toBe('/cadastro');
  });

  it('<title> e meta description próprios da rota', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    expect(elementosDoHead('title')[0]?.props.children).toBe(
      'Backhaul · A urgência decide quem sai na frente',
    );
    expect(elementosDoHead('meta')[0]?.props.content).toBe(
      'Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.',
    );
  });

  it('ao sair da página inicial (redirecionamento) a marca sai do <html>', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });
    jest.mocked(liberarPaginaInicial).mockClear();

    await screen.unmount();
    expect(liberarPaginaInicial).toHaveBeenCalled();
  });

  it('visitante sem sessão: libera a página (tira a marca do <html>) e continua em /', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    await waitFor(() => expect(liberarPaginaInicial).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeOnTheScreen();
  });
});
