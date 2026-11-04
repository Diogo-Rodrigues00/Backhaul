// Filtro de contato do chat no mock: tem que recusar o que o backend recusa (backend/src/validacao.ts),
// com a mesma mensagem e a mesma ordem de checagem. Cada linha é um caso documentado.
import { contemContato, MENSAGEM_MAXIMA_CARACTERES, validarTextoMensagem } from './mensagens';

const MENSAGEM_CONTATO = 'mensagem não pode conter telefone, e-mail ou link';

describe('filtro de contato do chat (espelho do backend)', () => {
  it.each([
    ['telefone sem pontuação', 'me liga 1199999999'],
    ['telefone com hífen e espaço', 'me liga 11 99999-9999'],
    ['telefone com parênteses', 'meu fone é (34) 3333-4444'],
    ['10 dígitos separados por espaço', 'um a um 1 2 3 4 5 6 7 8 9 0 é o número'],
    ['e-mail', 'manda para joao@exemplo.com'],
    ['e-mail com "arroba" por extenso', 'joao arroba exemplo'],
    ['"Arroba" com maiúscula também', 'Arroba do Joao'],
    ['link http', 'veja http://exemplo.org'],
    ['link https', 'confira https://exemplo.org/x'],
    ['www.', 'site www.exemplo'],
    ['domínio .com', 'acesse loja.com agora'],
    ['domínio .br', 'acesse loja.br agora'],
    ['domínio .me', 'acesse eu.me agora'],
    ['domínio .ly', 'acesse bit.ly agora'],
  ])('recusa %s', (_, texto) => {
    expect(contemContato(texto)).toBe(true);
    expect(validarTextoMensagem(texto)).toEqual({ ok: false, erros: [MENSAGEM_CONTATO] });
  });

  it.each([
    ['horário', 'Chego na coleta às 14h.'],
    ['valor com centavos', 'Fecho por 3500.00 e 9 dias de prazo'],
    ['portão', 'Combinado, portão 2.'],
    ['CNPJ com barra (não é sequência de dígitos)', 'Nota 12.345.678/0001-95'],
    ['palavra com "com" no meio', 'Pode ser company, sem problema'],
    ['nove dígitos seguidos', 'Pedido 123456789 confirmado'],
  ])('aceita %s', (_, texto) => {
    expect(contemContato(texto)).toBe(false);
    expect(validarTextoMensagem(texto)).toEqual({ ok: true, texto });
  });

  it('devolve o texto sem espaços nas pontas', () => {
    expect(validarTextoMensagem('   Oi, tudo bem?   ')).toEqual({
      ok: true,
      texto: 'Oi, tudo bem?',
    });
  });
});

describe('validarTextoMensagem: obrigatório, tamanho e contato, nessa ordem', () => {
  it.each([undefined, null, 42, '', '   '])(
    'texto vazio ou inválido (%p) é obrigatório',
    (valor) => {
      expect(validarTextoMensagem(valor)).toEqual({ ok: false, erros: ['texto é obrigatório'] });
    },
  );

  it('aceita exatamente 1000 caracteres e recusa 1001', () => {
    const limite = 'a'.repeat(MENSAGEM_MAXIMA_CARACTERES);
    expect(validarTextoMensagem(limite)).toEqual({ ok: true, texto: limite });
    expect(validarTextoMensagem(`${limite}a`)).toEqual({
      ok: false,
      erros: ['texto deve ter no máximo 1000 caracteres'],
    });
  });

  it('conta o tamanho depois de tirar os espaços das pontas', () => {
    const comEspacos = `   ${'a'.repeat(MENSAGEM_MAXIMA_CARACTERES)}   `;
    expect(validarTextoMensagem(comEspacos).ok).toBe(true);
  });

  it('texto longo com contato recebe a mensagem de tamanho (tamanho vem antes)', () => {
    const longo = `${'a'.repeat(MENSAGEM_MAXIMA_CARACTERES)} joao@exemplo.com`;
    expect(validarTextoMensagem(longo)).toEqual({
      ok: false,
      erros: ['texto deve ter no máximo 1000 caracteres'],
    });
  });
});
