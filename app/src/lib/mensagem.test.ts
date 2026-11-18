import {
  contemContato,
  ERRO_CONTATO_NA_MENSAGEM,
  ERRO_MENSAGEM_LONGA,
  ERRO_MENSAGEM_VAZIA,
  validarMensagem,
} from './mensagem';

describe('validarMensagem', () => {
  it('texto vazio ou só com espaços: pede para escrever', () => {
    expect(validarMensagem('')).toEqual({ ok: false, erro: ERRO_MENSAGEM_VAZIA });
    expect(validarMensagem('   \n  ')).toEqual({ ok: false, erro: ERRO_MENSAGEM_VAZIA });
  });

  it('aceita 1000 caracteres e recusa 1001', () => {
    expect(validarMensagem('a'.repeat(1000))).toEqual({ ok: true, texto: 'a'.repeat(1000) });
    expect(validarMensagem('a'.repeat(1001))).toEqual({ ok: false, erro: ERRO_MENSAGEM_LONGA });
  });

  it('conta o tamanho sem os espaços das pontas e devolve o texto aparado', () => {
    expect(validarMensagem(`  ${'a'.repeat(1000)}  `)).toEqual({
      ok: true,
      texto: 'a'.repeat(1000),
    });
    expect(validarMensagem('  Chego às 14h no portão 2  ')).toEqual({
      ok: true,
      texto: 'Chego às 14h no portão 2',
    });
  });

  it.each([
    ['telefone com pontuação', 'Me liga: (34) 99999-8888'],
    ['telefone com espaço', 'Fala no 34 99999-8888'],
    ['e-mail', 'joao@exemplo.com'],
    ['arroba por extenso', 'joao arroba gmail'],
    ['www', 'veja www.site'],
    ['http', 'acesse https://x.y/z'],
    ['domínio .com', 'meusite.com'],
    ['domínio .br', 'exemplo.com.br'],
  ])('recusa %s com a frase para a pessoa', (_nome, texto) => {
    expect(validarMensagem(texto)).toEqual({ ok: false, erro: ERRO_CONTATO_NA_MENSAGEM });
  });

  it('ERRO_CONTATO_NA_MENSAGEM é a frase do card', () => {
    expect(ERRO_CONTATO_NA_MENSAGEM).toBe(
      'Não envie telefone, e-mail ou link. Combine tudo por aqui.',
    );
  });

  it('valores e horários com poucos dígitos passam ("3500.00", "14h", "portão 2")', () => {
    expect(validarMensagem('Fecho por 3500.00').ok).toBe(true);
    expect(validarMensagem('Chego às 14h no portão 2').ok).toBe(true);
    expect(validarMensagem('Placa ABC1D23, 15000 kg').ok).toBe(true);
  });
});

describe('contemContato', () => {
  it('9 dígitos passam e 10 ou mais não', () => {
    expect(contemContato('123456789')).toBe(false);
    expect(contemContato('1234567890')).toBe(true);
  });
});
