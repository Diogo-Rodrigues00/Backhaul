import { comNovaTentativa } from './carregamento';

describe('comNovaTentativa', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('devolve na hora quando o carregamento dá certo', async () => {
    const carregar = jest.fn().mockResolvedValue('tela');

    await expect(comNovaTentativa(carregar)).resolves.toBe('tela');
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it('chama de novo (um import novo) depois de uma falha e resolve', async () => {
    const carregar = jest
      .fn()
      .mockRejectedValueOnce(new Error('chunk não baixou'))
      .mockResolvedValue('tela');

    const resultado = comNovaTentativa(carregar, { esperaMs: 100 });
    await jest.advanceTimersByTimeAsync(100);

    await expect(resultado).resolves.toBe('tela');
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it('espera o dobro a cada repetição e rejeita com o último erro quando acaba', async () => {
    const carregar = jest.fn().mockRejectedValue(new Error('sem conexão'));

    const resultado = comNovaTentativa(carregar, { repeticoes: 2, esperaMs: 100 });
    const rejeitou = expect(resultado).rejects.toThrow('sem conexão');
    await jest.advanceTimersByTimeAsync(99);
    expect(carregar).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(carregar).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(199);
    expect(carregar).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);

    await rejeitou;
    expect(carregar).toHaveBeenCalledTimes(3);
  });

  it('sem repetições rejeita na primeira falha', async () => {
    const carregar = jest.fn().mockRejectedValue(new Error('x'));

    await expect(comNovaTentativa(carregar, { repeticoes: 0 })).rejects.toThrow('x');
    expect(carregar).toHaveBeenCalledTimes(1);
  });
});
