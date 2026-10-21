import { Platform } from 'react-native';

import { fonte, maxFontSizeMultiplier } from './tipografia';
import { type } from './tokens';

describe('fonte()', () => {
  it('web: família com fallback, peso numérico e tamanhos em rem', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(fonte('base')).toEqual({
      fontFamily: expect.stringContaining('"Barlow"'),
      fontWeight: '500',
      fontSize: '1.0625rem',
      lineHeight: '1.625rem',
    });
    expect(fonte('xl')).toMatchObject({
      fontWeight: '700',
      fontSize: '1.5rem',
      lineHeight: '1.875rem',
    });
  });

  it('web: o fallback inclui fontes do sistema', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(fonte('sm').fontFamily).toContain('system-ui');
  });

  it('iPhone: Barlow_500Medium / Barlow_700Bold e tamanhos em pontos', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(fonte('base')).toEqual({ fontFamily: 'Barlow_500Medium', fontSize: 17, lineHeight: 26 });
    expect(fonte('lg')).toEqual({ fontFamily: 'Barlow_700Bold', fontSize: 19, lineHeight: 24 });
  });

  it('peso troca só o peso do nível, nas duas plataformas', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(fonte('base', 'bold')).toMatchObject({ fontWeight: '700', fontSize: '1.0625rem' });
    expect(fonte('xl', 'regular')).toMatchObject({ fontWeight: '500' });
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(fonte('base', 'bold')).toEqual({
      fontFamily: 'Barlow_700Bold',
      fontSize: 17,
      lineHeight: 26,
    });
  });

  it('cobre todos os níveis do DS', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    for (const nivel of Object.keys(type) as (keyof typeof type)[]) {
      expect(fonte(nivel).fontSize).toBe(type[nivel].size);
    }
  });

  it('Dynamic Type vai até 2x', () => {
    expect(maxFontSizeMultiplier).toBe(2);
  });
});
