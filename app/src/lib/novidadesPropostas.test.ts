import { descreverNovidades, idsNovos } from './novidadesPropostas';

const lista = (...ids: string[]) => ids.map((id) => ({ id }));

describe('descreverNovidades', () => {
  it('uma proposta nova: "1 nova proposta"', () => {
    expect(descreverNovidades(lista('a', 'b'), lista('a', 'b', 'c'))).toBe('1 nova proposta');
  });

  it('várias: plural "N novas propostas"', () => {
    expect(descreverNovidades(lista('a'), lista('a', 'b', 'c'))).toBe('2 novas propostas');
  });

  it('nenhuma nova (mesma lista, ou só mudou de ordem): null', () => {
    expect(descreverNovidades(lista('a', 'b'), lista('a', 'b'))).toBeNull();
    expect(descreverNovidades(lista('a', 'b'), lista('b', 'a'))).toBeNull();
  });

  it('proposta que sumiu não conta', () => {
    expect(descreverNovidades(lista('a', 'b'), lista('a'))).toBeNull();
  });

  it('sem um dos retratos: null', () => {
    expect(descreverNovidades(undefined, lista('a'))).toBeNull();
    expect(descreverNovidades(lista('a'), undefined)).toBeNull();
  });
});

describe('idsNovos', () => {
  it('na ordem da lista atual', () => {
    expect(idsNovos(lista('a'), lista('c', 'a', 'b'))).toEqual(['c', 'b']);
  });

  it('lista anterior vazia: todas são novas', () => {
    expect(idsNovos([], lista('a', 'b'))).toEqual(['a', 'b']);
  });
});
