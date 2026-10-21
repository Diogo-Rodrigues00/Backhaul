import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { Cabecalho } from '@/components/organisms/Cabecalho';
import { moverFoco } from '@/lib/a11y';
import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateTela } from './TemplateTela';

// moverFoco usa findNodeHandle (sem efeito no renderer de teste): espiado para ver se foi chamado.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));

// O <Head> do expo-router só escreve no HTML estático (no iPhone não renderiza nada). Aqui ele
// guarda o que recebeu para o teste ler <title> e <meta>.
const mockHead: { filhos: unknown } = { filhos: null };
jest.mock('expo-router/head', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    mockHead.filhos = children;
    return null;
  },
}));

function elementosDoHead(tipo: string): { props: Record<string, unknown> }[] {
  const filhos = ([] as { type: string; props: Record<string, unknown> }[]).concat(
    mockHead.filhos as never,
  );
  return filhos.filter((el) => el.type === tipo);
}

const abas = [
  { href: '/', rotulo: 'Início', icone: 'truck' },
  { href: '/outra', rotulo: 'Outra', icone: 'package' },
] as const;

function tela(titulo = 'Minhas cargas', extra: Record<string, unknown> = {}) {
  return (
    <TemplateTela
      titulo={titulo}
      descricao="Cargas que a sua empresa publicou."
      cabecalho={<Cabecalho variante="simples" />}
      {...extra}
    >
      <Text>conteúdo da tela</Text>
    </TemplateTela>
  );
}

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

beforeEach(() => {
  reiniciarCargaInicial();
  jest.mocked(moverFoco).mockClear();
});
afterEach(() => jest.restoreAllMocks());

describe('TemplateTela: estrutura', () => {
  it('tem um banner, um main (id "conteudo") e um único h1 com a descrição', async () => {
    await renderizarComRota(tela());
    expect(papel('banner')).toHaveLength(1);
    const [principal] = papel('main');
    expect(papel('main')).toHaveLength(1);
    expect(principal?.props.nativeID).toBe('conteudo');
    const titulos = screen.getAllByRole('heading');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.props['aria-level']).toBe(1);
    expect(screen.getByRole('heading', { name: 'Minhas cargas' })).toBeOnTheScreen();
    expect(screen.getByText('Cargas que a sua empresa publicou.')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo da tela')).toBeOnTheScreen();
  });

  it('o h1 aceita foco por código (tabIndex -1) e fica dentro do main', async () => {
    await renderizarComRota(tela());
    expect(screen.getByRole('heading').props.tabIndex).toBe(-1);
  });

  it('o main tem tabIndex -1: é o alvo do "Pular para o conteúdo"', async () => {
    await renderizarComRota(tela());
    expect(papel('main')[0]?.props.tabIndex).toBe(-1);
  });

  it('mostra as ações à direita do título', async () => {
    await renderizarComRota(tela('Minhas cargas', { acoes: <Text>Publicar carga</Text> }));
    expect(screen.getByText('Publicar carga')).toBeOnTheScreen();
  });

  it('telas públicas (sem abas) não têm barra inferior nem navegação', async () => {
    await renderizarComRota(tela());
    expect(papel('navigation')).toHaveLength(0);
  });

  it('logado (com abas) mostra a barra inferior com os mesmos links', async () => {
    await renderizarComRota(tela('Minhas cargas', { abas }), { rotas: ['outra'] });
    const [nav] = papel('navigation');
    expect(nav?.props['aria-label']).toBe('Principal');
    expect(screen.getByRole('link', { name: 'Outra' })).toBeOnTheScreen();
  });
});

describe('TemplateTela: título e descrição da rota', () => {
  it('<title> é "{título} · Backhaul" e a meta description é a descrição', async () => {
    await renderizarComRota(tela());
    expect(elementosDoHead('title')[0]?.props.children).toBe('Minhas cargas · Backhaul');
    expect(elementosDoHead('meta')[0]?.props).toMatchObject({
      name: 'description',
      content: 'Cargas que a sua empresa publicou.',
    });
  });

  it('tituloDaPagina troca o <title> inteiro (a página inicial não vira "Backhaul · Backhaul")', async () => {
    await renderizarComRota(tela('Backhaul', { tituloDaPagina: 'Backhaul' }));
    expect(elementosDoHead('title')[0]?.props.children).toBe('Backhaul');
  });
});

describe('TemplateTela: foco no h1', () => {
  it('na carga inicial não mexe no foco (recarregar não rouba o foco)', async () => {
    await renderizarComRota(tela());
    expect(moverFoco).not.toHaveBeenCalled();
  });

  it('ao navegar no cliente leva o foco ao h1 da nova tela', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(moverFoco).not.toHaveBeenCalled();
    await act(async () => router.push('/outra'));
    expect(moverFoco).toHaveBeenCalledTimes(1);
  });
});
