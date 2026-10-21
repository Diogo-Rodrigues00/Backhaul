import type { RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';

import { anunciar, moverFoco } from './a11y.native';
import { ouvirAnuncios } from './a11yComum';

// findNodeHandle do react-native vem de RendererProxy: trocamos só ele, sem mockar o módulo inteiro.
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual<object>('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(),
}));

const handle = jest.mocked(findNodeHandle);
let announce: jest.SpyInstance;
let setFocus: jest.SpyInstance;

describe('a11y nativo (iPhone)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    setFocus = jest
      .spyOn(AccessibilityInfo, 'setAccessibilityFocus')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('anunciar fala com o VoiceOver e avisa a região viva', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    anunciar('  Proposta aceita  ');

    expect(announce).toHaveBeenCalledWith('Proposta aceita');
    expect(ouvinte).toHaveBeenCalledWith('Proposta aceita');
    parar();
  });

  it('anunciar ignora mensagem vazia', () => {
    anunciar('   ');

    expect(announce).not.toHaveBeenCalled();
  });

  it('moverFoco leva o foco do VoiceOver ao nó encontrado', () => {
    handle.mockReturnValue(42);
    const ref = { current: {} } as RefObject<unknown>;

    moverFoco(ref);

    expect(handle).toHaveBeenCalledWith(ref.current);
    expect(setFocus).toHaveBeenCalledWith(42);
  });

  it('moverFoco não faz nada sem elemento ou sem nó nativo', () => {
    moverFoco({ current: null } as RefObject<unknown>);
    expect(setFocus).not.toHaveBeenCalled();

    handle.mockReturnValue(null);
    moverFoco({ current: {} } as RefObject<unknown>);
    expect(setFocus).not.toHaveBeenCalled();
  });
});
