import { renderHook } from '@testing-library/react-native';

import { moverFoco } from '@/lib/a11y';

import { reiniciarCargaInicial, useFocoNoTitulo } from './useFocoNoTitulo';

jest.mock('@/lib/a11y', () => ({ moverFoco: jest.fn() }));

const ref = { current: {} };

beforeEach(() => {
  jest.mocked(moverFoco).mockClear();
  reiniciarCargaInicial();
});

describe('useFocoNoTitulo', () => {
  it('na carga inicial não mexe no foco (recarregar não rouba o foco)', async () => {
    await renderHook(() => useFocoNoTitulo(ref));
    expect(moverFoco).not.toHaveBeenCalled();
  });

  it('numa tela aberta depois (navegação no cliente) leva o foco ao título', async () => {
    await renderHook(() => useFocoNoTitulo(ref));
    await renderHook(() => useFocoNoTitulo(ref));
    expect(moverFoco).toHaveBeenCalledTimes(1);
    expect(moverFoco).toHaveBeenCalledWith(ref);
  });

  it('re-render da mesma tela não move o foco de novo', async () => {
    await renderHook(() => useFocoNoTitulo(ref));
    const segunda = await renderHook(() => useFocoNoTitulo(ref));
    await segunda.rerender({});
    expect(moverFoco).toHaveBeenCalledTimes(1);
  });
});
