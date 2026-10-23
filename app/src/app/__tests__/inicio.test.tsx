// Página inicial pública (`/`): marca, frase do produto e as duas portas de entrada.
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { liberarPaginaInicial } from '@/lib/sessaoNaInicial';

import LayoutRaiz from '../_layout';
import Inicio from '../index';

jest.mock('@/lib/sessaoNaInicial', () => ({
  ...jest.requireActual('@/lib/sessaoNaInicial'),
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
  it('um único h1, a descrição, a marca e a frase do produto', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    const titulos = screen.getAllByRole('heading');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.props['aria-level']).toBe(1);
    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Backhaul' })).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas.',
      ),
    ).toBeOnTheScreen();
    // O painel da marca é decorativo (aria-hidden) e traz a frase do produto, como no login.
    expect(screen.getByText('quem sai na frente.', { includeHiddenElements: true })).toBeTruthy();
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

  it('visitante sem sessão: libera a página (tira a marca do <html>) e continua em /', async () => {
    await renderRouter({ _layout: LayoutRaiz, index: Inicio }, { initialUrl: '/' });

    await waitFor(() => expect(liberarPaginaInicial).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeOnTheScreen();
  });
});
