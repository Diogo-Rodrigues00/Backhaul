import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useMovimentoReduzido } from './useMovimentoReduzido';

describe('useMovimentoReduzido', () => {
  afterEach(() => jest.restoreAllMocks());

  it('começa em false e passa a true quando o sistema pede menos movimento', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);

    const { result } = await renderHook(() => useMovimentoReduzido());
    await act(async () => {});

    expect(result.current).toBe(true);
  });

  it('acompanha mudanças e remove a assinatura ao desmontar', async () => {
    const remove = jest.fn();
    let aoMudar: (valor: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((evento, ouvinte) => {
      expect(evento).toBe('reduceMotionChanged');
      aoMudar = ouvinte as unknown as (valor: boolean) => void;
      return { remove } as never;
    });

    const { result, unmount } = await renderHook(() => useMovimentoReduzido());
    await act(async () => {});
    expect(result.current).toBe(false);

    await act(async () => aoMudar(true));
    expect(result.current).toBe(true);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
