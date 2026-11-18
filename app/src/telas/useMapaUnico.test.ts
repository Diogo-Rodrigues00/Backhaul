import { act, renderHook } from '@testing-library/react-native';

import { useMapaUnico } from './useMapaUnico';

describe('useMapaUnico', () => {
  it('abre um mapa por vez, fecha ao repetir a chave e `fechar` zera o aberto (card 046)', async () => {
    const { result } = await renderHook(() => useMapaUnico());
    expect(result.current.aberto).toBeNull();

    await act(async () => result.current.alternar('geral'));
    expect(result.current.aberto).toBe('geral');
    await act(async () => result.current.alternar('carga-1'));
    expect(result.current.aberto).toBe('carga-1');
    await act(async () => result.current.alternar('carga-1'));
    expect(result.current.aberto).toBeNull();

    await act(async () => result.current.alternar('geral'));
    await act(async () => result.current.fechar());
    expect(result.current.aberto).toBeNull();
  });
});
