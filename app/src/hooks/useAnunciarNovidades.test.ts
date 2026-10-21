import { renderHook } from '@testing-library/react-native';

import { anunciar } from '@/lib/a11y';

import { useAnunciarNovidades } from './useAnunciarNovidades';

jest.mock('@/lib/a11y', () => ({ anunciar: jest.fn() }));

const anunciarMock = jest.mocked(anunciar);

type Proposta = { id: string }[];

const descreverNovas = (anterior: Proposta, atual: Proposta): string | null => {
  const diferenca = atual.length - anterior.length;
  return diferenca > 0 ? `${diferenca} nova proposta` : null;
};

describe('useAnunciarNovidades', () => {
  beforeEach(() => {
    anunciarMock.mockClear();
  });

  it('não anuncia na primeira carga', async () => {
    await renderHook(() => useAnunciarNovidades<Proposta>([{ id: 'a' }], descreverNovas));

    expect(anunciarMock).not.toHaveBeenCalled();
  });

  it('anuncia o texto de descrever quando os dados mudam', async () => {
    const { rerender } = await renderHook(
      ({ dados }: { dados: Proposta }) => useAnunciarNovidades(dados, descreverNovas),
      { initialProps: { dados: [{ id: 'a' }] } },
    );

    await rerender({ dados: [{ id: 'a' }, { id: 'b' }] });

    expect(anunciarMock).toHaveBeenCalledTimes(1);
    expect(anunciarMock).toHaveBeenCalledWith('1 nova proposta');
  });

  it('não anuncia quando a referência dos dados não muda', async () => {
    const dados: Proposta = [{ id: 'a' }];
    const { rerender } = await renderHook(
      ({ atual }: { atual: Proposta }) => useAnunciarNovidades(atual, descreverNovas),
      { initialProps: { atual: dados } },
    );

    await rerender({ atual: dados });
    await rerender({ atual: dados });

    expect(anunciarMock).not.toHaveBeenCalled();
  });

  it('não anuncia quando descrever devolve null', async () => {
    const { rerender } = await renderHook(
      ({ dados }: { dados: Proposta }) => useAnunciarNovidades(dados, descreverNovas),
      { initialProps: { dados: [{ id: 'a' }, { id: 'b' }] } },
    );

    await rerender({ dados: [{ id: 'a' }] });

    expect(anunciarMock).not.toHaveBeenCalled();
  });

  it('compara cada mudança com a anterior', async () => {
    const { rerender } = await renderHook(
      ({ dados }: { dados: Proposta }) => useAnunciarNovidades(dados, descreverNovas),
      { initialProps: { dados: [{ id: 'a' }] } },
    );

    await rerender({ dados: [{ id: 'a' }, { id: 'b' }] });
    await rerender({ dados: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });

    expect(anunciarMock.mock.calls).toEqual([['1 nova proposta'], ['1 nova proposta']]);
  });

  it('usa a versão mais recente de descrever', async () => {
    const { rerender } = await renderHook(
      ({ dados, descrever }: { dados: Proposta; descrever: typeof descreverNovas }) =>
        useAnunciarNovidades(dados, descrever),
      { initialProps: { dados: [{ id: 'a' }], descrever: descreverNovas } },
    );

    await rerender({ dados: [{ id: 'a' }, { id: 'b' }], descrever: () => 'Texto novo' });

    expect(anunciarMock).toHaveBeenCalledWith('Texto novo');
  });
});
