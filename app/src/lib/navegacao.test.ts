import { caminhoDoHref, ehPaginaAtual } from './navegacao';

describe('caminhoDoHref', () => {
  it('tira query e âncora', () => {
    expect(caminhoDoHref('/empresa/cargas?id=1')).toBe('/empresa/cargas');
    expect(caminhoDoHref('/#conteudo')).toBe('/');
  });

  it('aceita o formato { pathname }', () => {
    expect(caminhoDoHref({ pathname: '/motorista/propostas' })).toBe('/motorista/propostas');
  });
});

describe('ehPaginaAtual', () => {
  it('marca o próprio destino e as telas dentro dele', () => {
    expect(ehPaginaAtual('/empresa/cargas', '/empresa/cargas')).toBe(true);
    expect(ehPaginaAtual('/empresa/cargas/detalhe', '/empresa/cargas')).toBe(true);
    expect(ehPaginaAtual('/empresa/cargas/', '/empresa/cargas')).toBe(true);
  });

  it('não confunde prefixos parecidos', () => {
    expect(ehPaginaAtual('/empresa/cargas-antigas', '/empresa/cargas')).toBe(false);
    expect(ehPaginaAtual('/motorista', '/empresa/cargas')).toBe(false);
  });

  it('a raiz só marca a si mesma', () => {
    expect(ehPaginaAtual('/', '/')).toBe(true);
    expect(ehPaginaAtual('/empresa/cargas', '/')).toBe(false);
  });
});
