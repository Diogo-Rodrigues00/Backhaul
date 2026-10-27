import { caminhoDoHref, ehPaginaAtual, indiceDaPaginaAtual } from './navegacao';

describe('indiceDaPaginaAtual', () => {
  const hrefs = ['/empresa/cargas', '/empresa/cargas/nova', '/empresa/fretes'];

  it('marca o item mais específico quando dois contêm a página', () => {
    expect(indiceDaPaginaAtual('/empresa/cargas/nova', hrefs)).toBe(1);
    expect(indiceDaPaginaAtual('/empresa/cargas', hrefs)).toBe(0);
    expect(indiceDaPaginaAtual('/empresa/cargas/detalhe', hrefs)).toBe(0);
  });

  it('devolve -1 fora da navegação', () => {
    expect(indiceDaPaginaAtual('/admin', hrefs)).toBe(-1);
  });

  it('aceita hrefs no formato { pathname }', () => {
    expect(indiceDaPaginaAtual('/empresa/fretes', [{ pathname: '/empresa/fretes' }])).toBe(0);
  });
});

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
