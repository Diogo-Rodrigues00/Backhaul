import { act, renderHook } from '@testing-library/react-native';
import { type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { colors, space } from '@/theme/tokens';

import type { TemaVisual } from './montarTema';
import { TemaProvider } from './TemaProvider';
import { useEstilos } from './useEstilos';
import { useTema } from './useTema';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: { tema: 'backhaul.tema' },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const sistema = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

function Envolver({ children }: PropsWithChildren) {
  return <TemaProvider>{children}</TemaProvider>;
}

async function montar<T>(hook: () => T) {
  const resultado = await renderHook(hook, { wrapper: Envolver });
  await act(async () => {}); // deixa a leitura assíncrona do armazenamento terminar
  return resultado;
}

// O ambiente do Jest é Node (sem DOM): um <html> mínimo basta para o que a web grava em data-theme.
const html = { dataset: {} as Record<string, string | undefined> };

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  sistema.mockReturnValue('light');
  await apagar(CHAVES.tema);
  jest.clearAllMocks();
  html.dataset = {};
  Object.defineProperty(globalThis, 'document', {
    value: { documentElement: html },
    configurable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'document');
});

describe('useTema (iPhone)', () => {
  it('sem escolha salva, segue o sistema e devolve hex do esquema efetivo', async () => {
    sistema.mockReturnValue('dark');
    const { result } = await montar(() => useTema());

    expect(result.current.preferencia).toBe('sistema');
    expect(result.current.esquema).toBe('dark');
    expect(result.current.colors.bg.page).toBe(colors.dark.bg.page);
    expect(result.current.colors.bg.page).toBe('#0E1216');
  });

  it('esquema claro devolve os hex do claro', async () => {
    const { result } = await montar(() => useTema());
    expect(result.current.esquema).toBe('light');
    expect(result.current.colors.bg.page).toBe('#EDEFF2');
  });

  it('alternar cicla Sistema, Claro, Escuro e volta a Sistema', async () => {
    const { result } = await montar(() => useTema());
    const sequencia: string[] = [result.current.preferencia];
    for (let i = 0; i < 3; i++) {
      await act(async () => result.current.alternar());
      sequencia.push(result.current.preferencia);
    }
    expect(sequencia).toEqual(['sistema', 'claro', 'escuro', 'sistema']);
  });

  it('a escolha manual vale mesmo contra o sistema', async () => {
    sistema.mockReturnValue('dark');
    const { result } = await montar(() => useTema());
    await act(async () => result.current.alternar()); // claro
    expect(result.current.esquema).toBe('light');
    expect(result.current.colors.bg.page).toBe('#EDEFF2');
  });

  it('grava light/dark e apaga a chave em "Sistema"', async () => {
    const { result } = await montar(() => useTema());
    await act(async () => result.current.alternar());
    expect(gravar).toHaveBeenLastCalledWith(CHAVES.tema, 'light');
    await act(async () => result.current.alternar());
    expect(gravar).toHaveBeenLastCalledWith(CHAVES.tema, 'dark');
    await act(async () => result.current.alternar());
    expect(apagar).toHaveBeenLastCalledWith(CHAVES.tema);
  });

  it('restaura a escolha salva ao reabrir', async () => {
    await gravar(CHAVES.tema, 'dark');
    const { result } = await montar(() => useTema());
    expect(ler).toHaveBeenCalledWith(CHAVES.tema);
    expect(result.current.preferencia).toBe('escuro');
    expect(result.current.esquema).toBe('dark');
  });

  it('pronto só depois de ler a preferência salva (o layout segura o Slot até lá)', async () => {
    let liberar: (valor: string | null) => void = () => {};
    jest.mocked(ler).mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)));
    const { result } = await renderHook(() => useTema(), { wrapper: Envolver });
    expect(result.current.pronto).toBe(false);

    await act(async () => liberar('dark'));
    expect(result.current.pronto).toBe(true);
    expect(result.current.preferencia).toBe('escuro');
  });

  it('corrida: se o usuário alterna antes da leitura terminar, a leitura não sobrescreve', async () => {
    let liberar: (valor: string | null) => void = () => {};
    jest.mocked(ler).mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)));
    const { result } = await renderHook(() => useTema(), { wrapper: Envolver });

    await act(async () => result.current.alternar()); // sistema -> claro, antes de ler
    await act(async () => liberar('dark')); // chega tarde: valor antigo

    expect(result.current.preferencia).toBe('claro');
    expect(result.current.esquema).toBe('light');
    expect(result.current.pronto).toBe(true);
    expect(gravar).toHaveBeenLastCalledWith(CHAVES.tema, 'light');
  });

  it('valor salvo inválido vira Sistema', async () => {
    await gravar(CHAVES.tema, 'roxo');
    const { result } = await montar(() => useTema());
    expect(result.current.preferencia).toBe('sistema');
  });

  it('reexporta os tokens de espaço, raio, tipo, toque e movimento', async () => {
    const { result } = await montar(() => useTema());
    expect(result.current.space).toBe(space);
    expect(result.current.radius.md).toBe(10);
    expect(result.current.touch.control).toBe(48);
    expect(result.current.motion.duration.base).toBe(200);
    expect(result.current.type.base.size).toBe(17);
  });

  it('falha com mensagem clara fora do provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useTema())).rejects.toThrow(/TemaProvider/);
  });
});

describe('useTema (web)', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));

  it('colors são variáveis CSS constantes, em qualquer esquema', async () => {
    sistema.mockReturnValue('dark');
    const { result } = await montar(() => useTema());
    expect(result.current.colors.bg.page).toBe('var(--bg-page)');
    expect(result.current.colors.urgency.critico.text).toBe('var(--urgency-critico-text)');
    expect(result.current.sombra.card).toEqual({ boxShadow: 'var(--shadow-card)' });
  });

  it('alternar atualiza data-theme em <html> e Sistema remove o atributo', async () => {
    const { result } = await montar(() => useTema());
    await act(async () => result.current.alternar());
    expect(document.documentElement.dataset.theme).toBe('light');
    await act(async () => result.current.alternar());
    expect(document.documentElement.dataset.theme).toBe('dark');
    await act(async () => result.current.alternar());
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('corrida na web: leitura tardia não desfaz o data-theme da escolha do usuário', async () => {
    let liberar: (valor: string | null) => void = () => {};
    jest.mocked(ler).mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)));
    const { result } = await renderHook(() => useTema(), { wrapper: Envolver });
    await act(async () => result.current.alternar()); // claro
    await act(async () => liberar('dark'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('pronto é sempre true na web (o HTML estático renderiza o conteúdo)', async () => {
    jest.mocked(ler).mockImplementationOnce(() => new Promise(() => {}));
    const { result } = await renderHook(() => useTema(), { wrapper: Envolver });
    expect(result.current.pronto).toBe(true);
  });

  it('aplica a escolha salva em <html data-theme> ao montar', async () => {
    await gravar(CHAVES.tema, 'light');
    await montar(() => useTema());
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

function criarEstilos({ colors: c, space: e }: TemaVisual) {
  return { caixa: { backgroundColor: c.bg.page, padding: e[4] } };
}

describe('useEstilos', () => {
  it('memoiza por esquema: mesma referência enquanto o esquema não muda', async () => {
    const { result, rerender } = await montar(() => useEstilos(criarEstilos));
    const primeira = result.current;
    await rerender({});
    expect(result.current).toBe(primeira);
  });

  it('recalcula ao trocar de esquema e usa as cores dele (iPhone)', async () => {
    const { result } = await montar(() => ({ estilos: useEstilos(criarEstilos), tema: useTema() }));
    const claro = result.current.estilos;
    expect(claro.caixa.backgroundColor).toBe('#EDEFF2');

    await act(async () => result.current.tema.alternar()); // claro (continua claro)
    await act(async () => result.current.tema.alternar()); // escuro
    expect(result.current.estilos).not.toBe(claro);
    expect(result.current.estilos.caixa.backgroundColor).toBe('#0E1216');
  });

  it('na web os estilos usam variáveis e não mudam com o esquema', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const { result } = await montar(() => ({ estilos: useEstilos(criarEstilos), tema: useTema() }));
    const antes = result.current.estilos;
    expect(antes.caixa.backgroundColor).toBe('var(--bg-page)');
    await act(async () => result.current.tema.alternar());
    await act(async () => result.current.tema.alternar());
    expect(result.current.tema.esquema).toBe('dark');
    expect(result.current.estilos).toBe(antes);
  });
});
