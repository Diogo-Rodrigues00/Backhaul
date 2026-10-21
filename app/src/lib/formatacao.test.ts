import {
  formatarData,
  formatarDataHora,
  formatarDistancia,
  formatarMoeda,
  formatarPercentual,
  formatarPeso,
  formatarValidade,
  SEM_VALOR,
} from './formatacao';

describe('formatarMoeda', () => {
  it('formata número em real pt-BR (D-PO-12)', () => {
    expect(formatarMoeda(3500)).toBe('R$ 3.500,00');
  });

  it('aceita texto numérico vindo do NUMERIC do Postgres', () => {
    expect(formatarMoeda('3500.00')).toBe('R$ 3.500,00');
    expect(formatarMoeda(' 12.5 ')).toBe('R$ 12,50');
  });

  it('formata zero e negativo', () => {
    expect(formatarMoeda(0)).toBe('R$ 0,00');
    expect(formatarMoeda(-5)).toBe('-R$ 5,00');
  });

  it.each([null, undefined, '', 'abc', '12,5', Number.NaN, Number.POSITIVE_INFINITY])(
    'devolve o traço para valor ausente ou inválido (%p)',
    (valor) => {
      expect(formatarMoeda(valor)).toBe(SEM_VALOR);
    },
  );
});

describe('formatarDistancia', () => {
  it('formata com uma casa decimal e " km" (D-PO-12)', () => {
    expect(formatarDistancia(12.4)).toBe('12,4 km');
  });

  it('aceita texto, zero, negativo e separador de milhar', () => {
    expect(formatarDistancia('12.4')).toBe('12,4 km');
    expect(formatarDistancia(0)).toBe('0,0 km');
    expect(formatarDistancia(-1.5)).toBe('-1,5 km');
    expect(formatarDistancia(1000)).toBe('1.000,0 km');
  });

  it.each([null, undefined, '', 'longe'])('devolve o traço para %p', (valor) => {
    expect(formatarDistancia(valor)).toBe(SEM_VALOR);
  });
});

describe('formatarPeso', () => {
  it('formata sem casas decimais e com " kg" (D-PO-12)', () => {
    expect(formatarPeso(8000)).toBe('8.000 kg');
    expect(formatarPeso('8000.00')).toBe('8.000 kg');
  });

  it('trata zero e arredonda decimais', () => {
    expect(formatarPeso(0)).toBe('0 kg');
    expect(formatarPeso(1.4)).toBe('1 kg');
  });

  it.each([null, undefined, '', 'pesado'])('devolve o traço para %p', (valor) => {
    expect(formatarPeso(valor)).toBe(SEM_VALOR);
  });
});

describe('formatarPercentual', () => {
  it('mostra inteiro sem casas e decimal com vírgula (D-PO-12)', () => {
    expect(formatarPercentual(5)).toBe('5%');
    expect(formatarPercentual(2.5)).toBe('2,5%');
    expect(formatarPercentual('5.00')).toBe('5%');
    expect(formatarPercentual(0)).toBe('0%');
  });

  it.each([null, undefined, '', 'x'])('devolve o traço para %p', (valor) => {
    expect(formatarPercentual(valor)).toBe(SEM_VALOR);
  });
});

describe('formatarData e formatarValidade', () => {
  it('formata data civil YYYY-MM-DD sem deslocar o dia', () => {
    expect(formatarData('2027-05-01')).toBe('01/05/2027');
    expect(formatarValidade('2027-05-01')).toBe('01/05/2027');
  });

  it('formata ISO com hora no fuso de São Paulo (America/Sao_Paulo)', () => {
    // 03:00 UTC é meia-noite em Brasília
    expect(formatarValidade('2027-05-01T03:00:00.000Z')).toBe('01/05/2027');
    // 02:30 UTC do dia 1 ainda é 23:30 do dia 30 em Brasília
    expect(formatarData('2027-05-01T02:30:00.000Z')).toBe('30/04/2027');
  });

  it('aceita Date e rejeita datas inexistentes ou vazias', () => {
    expect(formatarData(new Date('2027-05-01T03:00:00.000Z'))).toBe('01/05/2027');
    expect(formatarData('2027-02-30')).toBe(SEM_VALOR);
    expect(formatarData('2027-13-01')).toBe(SEM_VALOR);
    expect(formatarData(new Date('x'))).toBe(SEM_VALOR);
  });

  it.each([null, undefined, '', '   ', 'amanhã'])('devolve o traço para %p', (valor) => {
    expect(formatarData(valor)).toBe(SEM_VALOR);
    expect(formatarValidade(valor)).toBe(SEM_VALOR);
  });
});

describe('formatarDataHora', () => {
  it('mostra data e hora de Brasília', () => {
    expect(formatarDataHora('2027-05-01T02:30:00.000Z')).toBe('30/04/2027, 23:30');
  });

  it('trata YYYY-MM-DD como meia-noite de Brasília', () => {
    expect(formatarDataHora('2027-05-01')).toBe('01/05/2027, 00:00');
  });

  it('devolve o traço para valor ausente', () => {
    expect(formatarDataHora(null)).toBe(SEM_VALOR);
    expect(formatarDataHora('')).toBe(SEM_VALOR);
  });
});

describe('formatarDataHora sem suporte a fuso no Intl (Hermes)', () => {
  const DateTimeFormatOriginal = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = DateTimeFormatOriginal;
    jest.resetModules();
  });

  it('aplica o ajuste manual de -03:00 quando o fuso é ignorado', () => {
    // Simula o Hermes: o Intl aceita a chamada mas ignora o fuso (resolve UTC).
    Intl.DateTimeFormat = function SemFuso(
      locale?: string | string[],
      opcoes?: Intl.DateTimeFormatOptions,
    ) {
      const { timeZone: _ignorado, ...resto } = opcoes ?? {};
      return new DateTimeFormatOriginal(locale, resto);
    } as unknown as typeof Intl.DateTimeFormat;

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const semFuso = require('./formatacao') as typeof import('./formatacao');

    expect(semFuso.formatarDataHora('2027-05-01T02:30:00.000Z')).toBe('30/04/2027, 23:30');
    expect(semFuso.formatarData('2027-05-01T02:30:00.000Z')).toBe('30/04/2027');
    expect(semFuso.formatarData('2027-05-01')).toBe('01/05/2027');
  });
});
