import { Platform, StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';
import { coresWeb } from '@/theme/variaveis';

import { useLargura } from '@/theme/responsivo';

import { corDoTexto } from './corTexto';
import { Texto } from './Texto';
import { TextoOculto } from './TextoOculto';
import { Titulo } from './Titulo';

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

jest.mock('@/theme/responsivo', () => ({
  ...jest.requireActual('@/theme/responsivo'),
  useLargura: jest.fn(() => 750),
}));
const mockLargura = useLargura as jest.MockedFunction<typeof useLargura>;

afterEach(() => {
  jest.restoreAllMocks();
  mockLargura.mockReturnValue(750);
});

describe('Texto', () => {
  it('usa o nível base (17/26, Barlow 500) e o texto principal por padrão', async () => {
    await renderizar(<Texto>Olá</Texto>);
    const estilo = estiloDe(screen.getByText('Olá'));
    expect(estilo).toMatchObject({
      fontFamily: 'Barlow_500Medium',
      fontSize: 17,
      lineHeight: 26,
      color: colors.light.text.primary,
    });
  });

  it('nível, peso e papel de cor vêm dos tokens (nada literal)', async () => {
    await renderizar(
      <Texto nivel="sm" peso="bold" cor="discreto">
        Apoio
      </Texto>,
    );
    expect(estiloDe(screen.getByText('Apoio'))).toMatchObject({
      fontFamily: 'Barlow_700Bold',
      fontSize: 15,
      color: colors.light.text.muted,
    });
  });

  it('no tema escuro troca as cores, não a estrutura', async () => {
    await renderizar(<Texto cor="destaque">R$</Texto>, 'dark');
    expect(estiloDe(screen.getByText('R$')).color).toBe(colors.dark.text.accent);
  });

  it('Dynamic Type vai até 2x', async () => {
    await renderizar(<Texto>Escala</Texto>);
    expect(screen.getByText('Escala').props.maxFontSizeMultiplier).toBe(2);
  });

  it('numerico liga data-num (algarismos tabulares) e o padrão não', async () => {
    await renderizar(
      <>
        <Texto numerico>12,4</Texto>
        <Texto>texto</Texto>
      </>,
    );
    expect(screen.getByText('12,4').props.dataSet).toEqual({ num: '' });
    expect(screen.getByText('texto').props.dataSet).toBeUndefined();
  });

  it('corDoTexto cobre todos os papéis (hex no iPhone, var(--papel) na web)', () => {
    expect(corDoTexto(coresWeb, 'erro')).toBe('var(--error-text)');
    expect(corDoTexto(colors.light, 'erro')).toBe(colors.light.error.text);
    expect(corDoTexto(colors.dark, 'sobreAcao')).toBe(colors.dark.action.onFill);
    for (const cor of [
      'primario',
      'secundario',
      'discreto',
      'destaque',
      'link',
      'sobreInverso',
      'sobreInversoDiscreto',
      'sobreAcao',
      'erro',
      'sucesso',
      'info',
      'desabilitado',
    ] as const) {
      expect(corDoTexto(colors.light, cor)).toMatch(/^#/);
    }
  });
});

describe('Titulo', () => {
  it.each([
    [1, 38],
    [2, 24],
    [3, 19],
  ] as const)(
    'nível %i vira heading com aria-level igual e fonte de %i px',
    async (nivel, tamanho) => {
      await renderizar(<Titulo nivel={nivel}>Título</Titulo>);
      const titulo = screen.getByRole('heading', { name: 'Título' });
      expect(titulo.props['aria-level']).toBe(nivel);
      expect(estiloDe(titulo)).toMatchObject({ fontSize: tamanho, fontFamily: 'Barlow_700Bold' });
    },
  );

  describe('h1 responsivo (DS 3.3: 38/44 acima de 720 px, 30/36 até 720 px)', () => {
    function larguraDaJanela(width: number) {
      mockLargura.mockReturnValue(width);
    }

    it('iPhone: até 720 px o h1 usa 30/36', async () => {
      larguraDaJanela(390);
      await renderizar(<Titulo nivel={1}>Entrar</Titulo>);
      expect(estiloDe(screen.getByRole('heading'))).toMatchObject({ fontSize: 30, lineHeight: 36 });
    });

    it('iPhone: no limite de 720 px ainda é 30/36 e acima volta para 38/44', async () => {
      larguraDaJanela(720);
      await renderizar(<Titulo nivel={1}>Entrar</Titulo>);
      expect(estiloDe(screen.getByRole('heading')).fontSize).toBe(30);
      await screen.unmount();
      larguraDaJanela(721);
      await renderizar(<Titulo nivel={1}>Entrar</Titulo>);
      expect(estiloDe(screen.getByRole('heading'))).toMatchObject({ fontSize: 38, lineHeight: 44 });
    });

    it('h2 e h3 não mudam com a largura', async () => {
      larguraDaJanela(390);
      await renderizar(
        <>
          <Titulo nivel={2}>Dois</Titulo>
          <Titulo nivel={3}>Três</Titulo>
        </>,
      );
      expect(estiloDe(screen.getByText('Dois')).fontSize).toBe(24);
      expect(estiloDe(screen.getByText('Três')).fontSize).toBe(19);
    });

    it('web: só o h1 leva data-titulo (o CSS global troca o tamanho) e o tamanho do JS não muda', async () => {
      jest.replaceProperty(Platform, 'OS', 'web');
      larguraDaJanela(390);
      await renderizar(
        <>
          <Titulo nivel={1}>Um</Titulo>
          <Titulo nivel={2}>Dois</Titulo>
        </>,
      );
      expect(screen.getByText('Um').props.dataSet).toEqual({ titulo: '1' });
      expect(screen.getByText('Dois').props.dataSet).toBeUndefined();
      expect(estiloDe(screen.getByText('Um')).fontSize).toBe('2.375rem');
    });
  });

  it('repassa ref e tabIndex={-1} (foco no h1 ao trocar de rota)', async () => {
    const ref = { current: null as unknown };
    await renderizar(
      <Titulo nivel={1} ref={ref as never} tabIndex={-1}>
        Tela
      </Titulo>,
    );
    expect(ref.current).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Tela' }).props.tabIndex).toBe(-1);
  });
});

describe('TextoOculto', () => {
  it('continua na árvore de acessibilidade (não usa aria-hidden nem display none)', async () => {
    await renderizar(<TextoOculto>(etapa atual)</TextoOculto>);
    const oculto = screen.getByText('(etapa atual)');
    const estilo = estiloDe(oculto);
    expect(estilo).toMatchObject({ position: 'absolute', width: 1, height: 1, overflow: 'hidden' });
    expect(estilo.display).toBeUndefined();
    expect(estilo.opacity).toBeUndefined();
    expect(oculto.props['aria-hidden']).toBeUndefined();
  });
});

describe('web', () => {
  it('Texto usa rem e a família com fallback', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<Texto>Web</Texto>);
    expect(estiloDe(screen.getByText('Web'))).toMatchObject({
      fontSize: '1.0625rem',
      fontWeight: '500',
      color: 'var(--text-primary)',
    });
  });
});
