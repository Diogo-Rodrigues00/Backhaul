import { CHAVES } from './armazenamentoComum';
import { ATRIBUTO_SESSAO_INICIAL, liberarPaginaInicial } from './paginaInicial';
import {
  ATRASO_LIBERAR_SEGUNDOS,
  CSS_SESSAO_INICIAL,
  SCRIPT_SESSAO_INICIAL,
} from './sessaoNaInicial';

// Executa o script do <head> contra um `location`, um `localStorage` e um `document` de mentira.
function rodar(pathname: string, token: string | null, quebra = false) {
  const marcas: string[] = [];
  const ambiente = {
    location: { pathname },
    localStorage: {
      getItem: (chave: string) => {
        if (quebra) throw new Error('dados do site bloqueados');
        return chave === CHAVES.token ? token : null;
      },
    },
    document: { documentElement: { setAttribute: (nome: string) => marcas.push(nome) } },
  };
  new Function('location', 'localStorage', 'document', SCRIPT_SESSAO_INICIAL)(
    ambiente.location,
    ambiente.localStorage,
    ambiente.document,
  );
  return marcas;
}

describe('script que esconde a apresentação de quem já tem sessão', () => {
  it('em / com token guardado marca o <html>', () => {
    expect(rodar('/', 'jwt')).toEqual([ATRIBUTO_SESSAO_INICIAL]);
  });

  it('visitante (sem token) não muda nada: o HTML estático segue sendo o LCP', () => {
    expect(rodar('/', null)).toEqual([]);
  });

  it('só vale em /: /entrar e as demais rotas não são escondidas', () => {
    expect(rodar('/entrar', 'jwt')).toEqual([]);
    expect(rodar('/cadastro', 'jwt')).toEqual([]);
  });

  it('localStorage bloqueado não quebra a página', () => {
    expect(rodar('/', 'jwt', true)).toEqual([]);
  });

  it('a chave lida é a do token da sessão', () => {
    expect(SCRIPT_SESSAO_INICIAL).toContain(`'${CHAVES.token}'`);
  });

  it('o CSS só esconde o <main> da home quando a marca está no <html>', () => {
    expect(CSS_SESSAO_INICIAL).toContain(
      `html[${ATRIBUTO_SESSAO_INICIAL}] #conteudo:has([data-inicio]){visibility:hidden;`,
    );
  });

  it('o CSS devolve a home sozinho depois de 7 s, sem JavaScript (rede de segurança)', () => {
    expect(ATRASO_LIBERAR_SEGUNDOS).toBe(7);
    expect(CSS_SESSAO_INICIAL).toContain('animation:backhaul-liberar-inicio .01s 7s forwards');
    expect(CSS_SESSAO_INICIAL).toContain(
      '@keyframes backhaul-liberar-inicio{to{visibility:visible}}',
    );
  });
});

describe('liberarPaginaInicial', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('tira a marca do <html>', () => {
    const removeAttribute = jest.fn();
    Object.assign(globalThis, { document: { documentElement: { removeAttribute } } });
    liberarPaginaInicial();
    expect(removeAttribute).toHaveBeenCalledWith(ATRIBUTO_SESSAO_INICIAL);
  });

  it('no iPhone (sem document) não faz nada', () => {
    expect(() => liberarPaginaInicial()).not.toThrow();
  });
});
