import { act, renderHook } from '@testing-library/react-native';

import { idDoPainelDaConversa, useUmaConversaAberta } from './useUmaConversaAberta';

describe('useUmaConversaAberta', () => {
  it('começa sem conversa aberta', async () => {
    const { result } = await renderHook(() => useUmaConversaAberta());
    expect(result.current.aberta).toBeNull();
    expect(result.current.estaAberta('a')).toBe(false);
  });

  it('alternar abre, e alternar de novo fecha', async () => {
    const { result } = await renderHook(() => useUmaConversaAberta());
    await act(async () => result.current.alternar('a'));
    expect(result.current.estaAberta('a')).toBe(true);
    await act(async () => result.current.alternar('a'));
    expect(result.current.aberta).toBeNull();
  });

  it('abrir outra fecha a anterior (uma por tela)', async () => {
    const { result } = await renderHook(() => useUmaConversaAberta());
    await act(async () => result.current.alternar('a'));
    await act(async () => result.current.alternar('b'));
    expect(result.current.estaAberta('a')).toBe(false);
    expect(result.current.estaAberta('b')).toBe(true);
  });

  it('o id do painel é estável por proposta', () => {
    expect(idDoPainelDaConversa('p1')).toBe('conversa-p1');
  });
});
