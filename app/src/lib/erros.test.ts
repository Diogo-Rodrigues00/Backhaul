import { eErro4xx, ErroApi, MENSAGEM_FALHA, separarMensagens } from './erros';

describe('ErroApi', () => {
  it('sempre tem ao menos uma mensagem', () => {
    const erro = new ErroApi({ tipo: 'falha', status: 500, mensagens: [] });
    expect(erro.mensagens).toEqual([MENSAGEM_FALHA]);
    expect(erro.message).toBe(MENSAGEM_FALHA);
    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe('ErroApi');
  });

  it('falha() usa a mensagem fixa', () => {
    const erro = ErroApi.falha(502);
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(502);
    expect(erro.mensagens).toEqual([MENSAGEM_FALHA]);
    expect(ErroApi.falha().status).toBeNull();
  });
});

describe('eErro4xx', () => {
  it('é verdadeiro só para ErroApi com status 4xx', () => {
    expect(eErro4xx(new ErroApi({ tipo: 'mensagem', status: 409, mensagens: ['x'] }))).toBe(true);
    expect(eErro4xx(new ErroApi({ tipo: 'sessao', status: 401, mensagens: ['x'] }))).toBe(true);
    expect(eErro4xx(ErroApi.falha(500))).toBe(false);
    expect(eErro4xx(ErroApi.falha())).toBe(false);
    expect(eErro4xx(new Error('x'))).toBe(false);
    expect(eErro4xx(undefined)).toBe(false);
  });
});

describe('separarMensagens', () => {
  const campos = ['cpf', 'email', 'senha'] as const;

  it('envia "cpf deve ter 11 dígitos" ao campo cpf e o resto ao resumo', () => {
    const erro = new ErroApi({
      tipo: 'validacao',
      status: 400,
      mensagens: ['cpf deve ter 11 dígitos', 'erro geral'],
    });
    expect(separarMensagens(erro, campos)).toEqual({
      porCampo: { cpf: 'cpf deve ter 11 dígitos' },
      resumo: ['erro geral'],
    });
  });

  it('não confunde campos com prefixo comum', () => {
    const erro = new ErroApi({
      tipo: 'validacao',
      status: 400,
      mensagens: ['cpf_responsavel deve ter 11 dígitos'],
    });
    const resultado = separarMensagens(erro, ['cpf', 'cpf_responsavel']);
    expect(resultado.porCampo).toEqual({
      cpf_responsavel: 'cpf_responsavel deve ter 11 dígitos',
    });
    expect(resultado.resumo).toEqual([]);
  });

  it('exige o espaço depois do nome do campo', () => {
    const erro = new ErroApi({ tipo: 'validacao', status: 400, mensagens: ['cpfx inválido'] });
    expect(separarMensagens(erro, campos)).toEqual({ porCampo: {}, resumo: ['cpfx inválido'] });
  });

  it('segunda mensagem do mesmo campo vai para o resumo', () => {
    const erro = new ErroApi({
      tipo: 'validacao',
      status: 400,
      mensagens: ['email inválido', 'email é obrigatório'],
    });
    expect(separarMensagens(erro, campos)).toEqual({
      porCampo: { email: 'email inválido' },
      resumo: ['email é obrigatório'],
    });
  });

  it('erros que não são de validação vão inteiros ao resumo', () => {
    const erro = new ErroApi({ tipo: 'mensagem', status: 409, mensagens: ['cpf já cadastrado'] });
    expect(separarMensagens(erro, campos)).toEqual({
      porCampo: {},
      resumo: ['cpf já cadastrado'],
    });
  });
});
