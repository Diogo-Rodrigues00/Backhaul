import { renderHook } from '@testing-library/react-native';
import { Animated, Platform } from 'react-native';

import { useLoopAnimado } from './useLoopAnimado';

describe('useLoopAnimado', () => {
  let timing: jest.SpyInstance;
  let loop: jest.SpyInstance;
  const iniciar = jest.fn();
  const parar = jest.fn();

  beforeEach(() => {
    iniciar.mockClear();
    parar.mockClear();
    timing = jest.spyOn(Animated, 'timing');
    loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start: iniciar, stop: parar } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ativo: inicia um loop de 0 a 1 na duração pedida', async () => {
    await renderHook(() => useLoopAnimado(true, 1000));
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 1000 }),
    );
    expect(loop).toHaveBeenCalledTimes(1);
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('inativo (movimento reduzido): não anima e o valor fica em 0', async () => {
    const { result } = await renderHook(() => useLoopAnimado(false, 1000));
    expect(loop).not.toHaveBeenCalled();
    expect(JSON.stringify(result.current)).toContain('0');
  });

  it('para o loop ao desmontar e quando fica inativo', async () => {
    const { rerender, unmount } = await renderHook(
      ({ ativo }: { ativo: boolean }) => useLoopAnimado(ativo, 500),
      { initialProps: { ativo: true } },
    );
    await rerender({ ativo: false });
    expect(parar).toHaveBeenCalledTimes(1);
    await rerender({ ativo: true });
    await unmount();
    expect(parar).toHaveBeenCalledTimes(2);
  });

  it('driver nativo no iPhone; JS na web (que não tem driver nativo)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderHook(() => useLoopAnimado(true, 100));
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ useNativeDriver: true }),
    );
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderHook(() => useLoopAnimado(true, 100));
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ useNativeDriver: false }),
    );
  });
});
