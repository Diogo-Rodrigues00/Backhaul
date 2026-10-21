import {
  digitos,
  email,
  maximo,
  MAX,
  minimo,
  numeroAte,
  numeroPositivo,
  numeroSemAmbiguidade,
  obrigatorio,
} from './validacao';

describe('obrigatorio', () => {
  it('aceita texto preenchido', () => {
    expect(obrigatorio('Transportes Silva')).toBe(true);
  });

  it.each([undefined, null, '', '   '])('recusa valor vazio (%p) com mensagem', (valor) => {
    expect(obrigatorio(valor)).toBe('Preencha este campo.');
  });
});

describe('email', () => {
  it('aceita e-mail com formato válido', () => {
    expect(email('empresa@mock.test')).toBe(true);
    expect(email('  motorista@mock.test  ')).toBe(true);
  });

  it.each(['sem-arroba.com', 'a@b', 'a b@c.com', '@dominio.com', ''])(
    'recusa "%s" com mensagem em pt-BR',
    (valor) => {
      expect(email(valor)).toBe('Informe um e-mail válido.');
    },
  );

  it('aceita o tamanho máximo do schema (150)', () => {
    const local = 'a'.repeat(MAX.email - '@x.com'.length);
    const valor = `${local}@x.com`;
    expect(valor).toHaveLength(MAX.email);
    expect(email(valor)).toBe(true);
    expect(maximo(MAX.email)(valor)).toBe(true);
  });
});

describe('minimo e maximo', () => {
  it('minimo: senha com 8 caracteres passa, 7 não', () => {
    expect(minimo(8)('12345678')).toBe(true);
    expect(minimo(8)('1234567')).toBe('Use pelo menos 8 caracteres.');
  });

  it('maximo: respeita o limite e recusa o que passa', () => {
    expect(maximo(3)('abc')).toBe(true);
    expect(maximo(3)('abcd')).toBe('Use no máximo 3 caracteres.');
  });

  it('trata null e undefined como texto vazio', () => {
    expect(minimo(1)(null)).toBe('Use pelo menos 1 caractere.');
    expect(minimo(2)(undefined)).toBe('Use pelo menos 2 caracteres.');
    expect(maximo(1)(undefined)).toBe(true);
  });
});

describe('digitos', () => {
  it('aceita CPF com pontuação (11 dígitos)', () => {
    expect(digitos(11)('123.456.789-01')).toBe(true);
    expect(digitos(11)('12345678901')).toBe(true);
  });

  it('aceita CNPJ com pontuação (14 dígitos)', () => {
    expect(digitos(14)('12.345.678/0001-90')).toBe(true);
  });

  it('recusa quantidade errada, vazio e letras', () => {
    expect(digitos(11)('123.456.789-0')).toBe('Informe 11 dígitos.');
    expect(digitos(11)('')).toBe('Informe 11 dígitos.');
    expect(digitos(11)('1234567890a')).toBe('Informe 11 dígitos.');
    expect(digitos(11)(null)).toBe('Informe 11 dígitos.');
  });
});

describe('numeroPositivo', () => {
  it('aceita número maior que zero, em número ou texto', () => {
    expect(numeroPositivo(8000)).toBe(true);
    expect(numeroPositivo('3,5')).toBe(true);
    expect(numeroPositivo('3.5')).toBe(true);
  });

  it.each([0, '0', -1, '-2', '', 'abc', null, undefined])('recusa %p com mensagem', (valor) => {
    expect(numeroPositivo(valor)).toBe('Informe um número maior que zero.');
  });
});

describe('numeroAte', () => {
  it('aceita de maior que zero até o limite (raio ≤ 500)', () => {
    expect(numeroAte(500)('50')).toBe(true);
    expect(numeroAte(500)('500')).toBe(true);
    expect(numeroAte(500)('0.5')).toBe(true);
  });

  it.each(['0', '501', '-1', 'x', ''])('recusa "%s"', (valor) => {
    expect(numeroAte(500)(valor)).toBe('Informe um número maior que zero e até 500.');
  });
});

describe('numeroSemAmbiguidade', () => {
  it.each([
    '1.234',
    '12.500',
    '0.125',
    ' 3.500 ',
    '1.234.567',
    '1,234.56',
    '1.2,3',
    '12.34,5',
    '1,2,3',
  ])('recusa "%s": pode ser milhar ou decimal', (valor) => {
    expect(numeroSemAmbiguidade(valor)).toBe(
      'Use vírgula para decimais e sem ponto de milhar (ex.: 1234 ou 1234,5).',
    );
  });

  it.each(['1234', '1234,5', '1.234,56', '3,5', '3.5', '3.50', '12.5', '8000', '', 8000, null])(
    'aceita %p',
    (valor) => {
      expect(numeroSemAmbiguidade(valor)).toBe(true);
    },
  );
});

describe('numeroPositivo e numeroAte leem como o envio (paraNumero)', () => {
  it('aceitam o milhar com vírgula decimal', () => {
    expect(numeroPositivo('1.234,56')).toBe(true);
    expect(numeroAte(500)('1.234,56')).toBe('Informe um número maior que zero e até 500.');
  });
});

describe('MAX (D-PO-14)', () => {
  it('traz os tamanhos máximos do schema', () => {
    expect(MAX).toEqual({
      email: 150,
      nome_completo: 150,
      razao_social: 150,
      cnh: 20,
      veiculo_tipo: 50,
      veiculo_placa: 10,
      tipo_carga: 80,
    });
  });
});
