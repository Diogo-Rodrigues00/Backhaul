import { fireEvent, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ID_CONTEUDO, PularParaConteudo } from './PularParaConteudo';

afterEach(() => {
  jest.restoreAllMocks();
  delete (globalThis as { document?: unknown }).document;
});

describe('PularParaConteudo', () => {
  it('no iPhone não renderiza (o VoiceOver navega por landmarks)', async () => {
    await renderizar(<PularParaConteudo />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('na web é um link "Pular para o conteúdo" apontando para o main', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<PularParaConteudo />);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(link.props.href).toBe(`#${ID_CONTEUDO}`);
  });

  it('fica fora da tela e aparece quando recebe o foco', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<PularParaConteudo />);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(JSON.stringify(StyleSheet.flatten(link.props.style).transform)).toContain('-300%');
    await fireEvent(link, 'focus');
    expect(StyleSheet.flatten(screen.getByRole('link').props.style).transform).toBeUndefined();
    await fireEvent(screen.getByRole('link'), 'blur');
    expect(StyleSheet.flatten(screen.getByRole('link').props.style).transform).toBeDefined();
  });

  it('ao ativar leva o foco ao main (sem seguir o href)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const focus = jest.fn();
    const scrollIntoView = jest.fn();
    (globalThis as { document?: unknown }).document = {
      getElementById: jest.fn(() => ({ focus, scrollIntoView })),
    };
    await renderizar(<PularParaConteudo />);
    const preventDefault = jest.fn();
    await fireEvent.press(screen.getByRole('link', { name: 'Pular para o conteúdo' }), {
      preventDefault,
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
