import { screen } from '@testing-library/react-native';
import { Text, useWindowDimensions } from 'react-native';

import { Cabecalho } from '@/components/organisms/Cabecalho';
import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateFormularioComPrevia } from './TemplateFormularioComPrevia';

jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));
jest.mock('expo-router/head', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const abas = [
  { href: '/', rotulo: 'Início', icone: 'truck' },
  { href: '/outra', rotulo: 'Outra', icone: 'package' },
] as const;

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

function tela(extra: Record<string, unknown> = {}) {
  return (
    <TemplateFormularioComPrevia
      titulo="Publicar carga"
      descricao="Descreva a carga e o prazo."
      cabecalho={<Cabecalho variante="simples" />}
      abas={abas}
      previa={<Text>prévia da carga</Text>}
      {...extra}
    >
      <Text>formulário</Text>
    </TemplateFormularioComPrevia>
  );
}

function janela(largura: number) {
  jest.mocked(useWindowDimensions).mockReturnValue({
    width: largura,
    height: 800,
    scale: 2,
    fontScale: 1,
  });
}

beforeEach(() => {
  reiniciarCargaInicial();
  janela(1280);
});

describe('TemplateFormularioComPrevia', () => {
  it('um banner, um main e um único h1; o formulário e a prévia aparecem em tela larga', async () => {
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(papel('banner')).toHaveLength(1);
    expect(papel('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Publicar carga' })).toBeOnTheScreen();
    expect(screen.getByText('formulário')).toBeOnTheScreen();
    expect(screen.getByText('prévia da carga')).toBeOnTheScreen();
  });

  it('logado em tela estreita: a navegação fica na barra de abas', async () => {
    janela(390);
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(papel('navigation')).toHaveLength(1);
  });

  it('até 960 px a prévia some e o formulário fica sozinho', async () => {
    janela(390);
    await renderizarComRota(tela(), { rotas: ['outra'] });
    expect(screen.queryByText('prévia da carga')).not.toBeOnTheScreen();
    expect(screen.getByText('formulário')).toBeOnTheScreen();
  });

  it('sem previa não há lateral', async () => {
    await renderizarComRota(tela({ previa: undefined }), { rotas: ['outra'] });
    expect(screen.queryByText('prévia da carga')).not.toBeOnTheScreen();
    expect(screen.getByText('formulário')).toBeOnTheScreen();
  });
});
