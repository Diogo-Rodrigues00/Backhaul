import { formatarDecimal } from './formatacao';
import {
  ateValorMaximo,
  cnpj,
  cnpjValido,
  cpf,
  cpfValido,
  digitos,
  email,
  maximo,
  MAX,
  minimo,
  numeroAte,
  numeroPositivo,
  numeroSemAmbiguidade,
  normalizarPlaca,
  obrigatorio,
  placa,
  placaValida,
  VALOR_MAXIMO,
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
    expect(digitos(11)('529.982.247-25')).toBe(true);
    expect(digitos(11)('52998224725')).toBe(true);
  });

  it('aceita CNPJ com pontuação (14 dígitos)', () => {
    expect(digitos(14)('11.222.333/0001-81')).toBe(true);
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

describe('ateValorMaximo (teto NUMERIC(10,2) do backend)', () => {
  it('aceita até 99.999.999,99, inclusive, e valores comuns', () => {
    expect(ateValorMaximo('99.999.999,99')).toBe(true);
    expect(ateValorMaximo('99999999.99')).toBe(true);
    expect(ateValorMaximo('1.234,56')).toBe(true);
    expect(ateValorMaximo(VALOR_MAXIMO)).toBe(true);
  });

  it('recusa acima do teto, inclusive uma casa a mais que a coluna aceita', () => {
    const mensagem = 'Informe um valor até 99.999.999,99.';
    expect(ateValorMaximo('100.000.000')).toBe(mensagem);
    expect(ateValorMaximo('99.999.999,991')).toBe(mensagem);
    expect(ateValorMaximo(100_000_000)).toBe(mensagem);
  });

  it('a mensagem sai do próprio teto, formatada em pt-BR', () => {
    expect(formatarDecimal(VALOR_MAXIMO)).toBe('99.999.999,99');
  });
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

const CPFS_VALIDOS = ['529.982.247-25', '987.654.321-00', '123.456.789-09', '111.444.777-35'];
const CNPJS_VALIDOS = ['11.222.333/0001-81', '12.345.678/0001-95'];

// Troca um dígito: soma 1 (com volta de 9 para 0) na posição `posicao` (0 = primeiro dígito).
// Os testes trocam só os dígitos verificadores: trocar um dígito do corpo pode, por acaso, ainda
// fechar a conta (o resto 0 e o resto 1 dão o mesmo dígito 0), e isso não é bug do validador.
function trocarDigito(documento: string, posicao: number): string {
  const apenas = documento.replace(/\D/g, '').split('');
  apenas[posicao] = String((Number(apenas[posicao]) + 1) % 10);
  return apenas.join('');
}

describe('cpfValido', () => {
  it.each(CPFS_VALIDOS)('aceita %s (só dígitos)', (valor) => {
    expect(cpfValido(valor.replace(/\D/g, ''))).toBe(true);
  });

  it.each(CPFS_VALIDOS)('recusa %s com um dígito verificador trocado', (valor) => {
    for (const posicao of [9, 10]) {
      expect(cpfValido(trocarDigito(valor, posicao))).toBe(false);
    }
  });

  it.each(['00000000000', '11111111111', '99999999999'])(
    'recusa sequência repetida %s',
    (valor) => {
      expect(cpfValido(valor)).toBe(false);
    },
  );

  it.each(['5299822472', '529982247250', '5299822472a', ''])('recusa tamanho/letra %p', (valor) => {
    expect(cpfValido(valor)).toBe(false);
  });
});

describe('cnpjValido', () => {
  it.each(CNPJS_VALIDOS)('aceita %s (só dígitos)', (valor) => {
    expect(cnpjValido(valor.replace(/\D/g, ''))).toBe(true);
  });

  it.each(CNPJS_VALIDOS)('recusa %s com um dígito verificador trocado', (valor) => {
    for (const posicao of [12, 13]) {
      expect(cnpjValido(trocarDigito(valor, posicao))).toBe(false);
    }
  });

  it.each(['00000000000000', '11111111111111'])('recusa sequência repetida %s', (valor) => {
    expect(cnpjValido(valor)).toBe(false);
  });

  it.each(['1122233300018', '112223330001810', '1122233300018a', ''])(
    'recusa tamanho/letra %p',
    (valor) => {
      expect(cnpjValido(valor)).toBe(false);
    },
  );
});

describe('placaValida e normalizarPlaca', () => {
  it.each(['ABC1234', 'ABC1D23', 'abc-1d23', 'abc 1234', ' ABC-1234 '])('aceita "%s"', (valor) => {
    expect(placaValida(valor)).toBe(true);
  });

  it.each(['AB12345', 'ABCD123', 'ABC12D3', 'ABC123', 'ABC12345', '', '123-ABCD'])(
    'recusa "%s"',
    (valor) => {
      expect(placaValida(valor)).toBe(false);
    },
  );

  it('normaliza como o backend: sem hífen/espaço e em maiúsculas', () => {
    expect(normalizarPlaca('abc-1d23')).toBe('ABC1D23');
  });
});

describe('validadores de tela cpf, cnpj e placa', () => {
  it.each(['529.982.247-25', '52998224725'])('cpf aceita %s (com ou sem pontuação)', (valor) => {
    expect(cpf(valor)).toBe(true);
  });

  it('cpf: contagem errada pede os dígitos; conta errada e repetido dizem "inválido"', () => {
    expect(cpf('529.982.247-2')).toBe('Informe 11 dígitos.');
    expect(cpf('5299822472a')).toBe('Informe 11 dígitos.');
    expect(cpf('')).toBe('Informe 11 dígitos.');
    expect(cpf('529.982.247-26')).toBe('CPF inválido. Confira os números.');
    expect(cpf('111.111.111-11')).toBe('CPF inválido. Confira os números.');
  });

  it.each(['11.222.333/0001-81', '11222333000181'])('cnpj aceita %s', (valor) => {
    expect(cnpj(valor)).toBe(true);
  });

  it('cnpj: contagem errada pede os dígitos; conta errada e repetido dizem "inválido"', () => {
    expect(cnpj('11.222.333/0001-8')).toBe('Informe 14 dígitos.');
    expect(cnpj('11.222.333/0001-82')).toBe('CNPJ inválido. Confira os números.');
    expect(cnpj('00.000.000/0000-00')).toBe('CNPJ inválido. Confira os números.');
  });

  it('placa: aceita os dois formatos e recusa o resto com o formato esperado', () => {
    expect(placa('abc-1d23')).toBe(true);
    expect(placa('ABC1234')).toBe(true);
    expect(placa('AB12345')).toBe('Use o formato ABC1234 ou ABC1D23.');
    expect(placa('')).toBe('Use o formato ABC1234 ou ABC1D23.');
    expect(placa(null)).toBe('Use o formato ABC1234 ou ABC1D23.');
  });
});
