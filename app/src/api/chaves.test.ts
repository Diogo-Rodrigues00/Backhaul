// Chaves de cache: o TanStack casa `invalidateQueries` por prefixo, então uma chave nunca pode ser
// prefixo de outra do mesmo grupo (invalidar o catálogo não pode derrubar as minhas, e vice-versa).
import { QueryClient } from '@tanstack/react-query';

import { chaves } from './chaves';

function eprefixo(prefixo: readonly unknown[], chave: readonly unknown[]): boolean {
  return prefixo.length <= chave.length && prefixo.every((parte, i) => parte === chave[i]);
}

describe('chaves.certificacoes', () => {
  const todas = [
    ['catalogo', chaves.certificacoes.catalogo()],
    ['minhas', chaves.certificacoes.minhas()],
    ['pendentes', chaves.certificacoes.pendentes()],
  ] as const;

  it('nenhuma chave é prefixo de outra', () => {
    for (const [nomeA, a] of todas) {
      for (const [nomeB, b] of todas) {
        if (nomeA === nomeB) continue;
        expect({ a: nomeA, b: nomeB, prefixo: eprefixo(a, b) }).toEqual({
          a: nomeA,
          b: nomeB,
          prefixo: false,
        });
      }
    }
  });

  it('invalidar uma não invalida as outras no cache', async () => {
    const cliente = new QueryClient();
    for (const [, chave] of todas) cliente.setQueryData(chave, { dados: true });

    await cliente.invalidateQueries({ queryKey: chaves.certificacoes.catalogo() });

    expect(cliente.getQueryState(chaves.certificacoes.catalogo())?.isInvalidated).toBe(true);
    expect(cliente.getQueryState(chaves.certificacoes.minhas())?.isInvalidated).toBe(false);
    expect(cliente.getQueryState(chaves.certificacoes.pendentes())?.isInvalidated).toBe(false);

    await cliente.invalidateQueries({ queryKey: chaves.certificacoes.minhas() });
    expect(cliente.getQueryState(chaves.certificacoes.pendentes())?.isInvalidated).toBe(false);
    cliente.clear();
  });
});
