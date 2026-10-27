// Simula o Hermes (iPhone), que ignora o fuso do Intl. O módulo precisa ser carregado com o
// Intl já simulado, por isso este caso fica num arquivo próprio e usa require (sem hoisting).

const DateTimeFormatOriginal = Intl.DateTimeFormat;

// Força UTC (não o fuso local, que pode ser o próprio São Paulo) para o caso de fallback de fato rodar.
Intl.DateTimeFormat = function SemFuso(
  locale?: string | string[],
  opcoes?: Intl.DateTimeFormatOptions,
) {
  return new DateTimeFormatOriginal(locale, { ...opcoes, timeZone: 'UTC' });
} as unknown as typeof Intl.DateTimeFormat;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { formatarData, formatarDataHora } = require('./formatacao') as typeof import('./formatacao');

Intl.DateTimeFormat = DateTimeFormatOriginal;

describe('formatação sem suporte a fuso no Intl (Hermes)', () => {
  it('aplica o ajuste manual de -03:00 em data e hora', () => {
    expect(formatarDataHora('2027-05-01T02:30:00.000Z')).toBe('30/04/2027, 23:30');
    expect(formatarData('2027-05-01T02:30:00.000Z')).toBe('30/04/2027');
  });

  it('mantém a data civil YYYY-MM-DD como meia-noite de Brasília', () => {
    expect(formatarData('2027-05-01')).toBe('01/05/2027');
    expect(formatarDataHora('2027-05-01')).toBe('01/05/2027, 00:00');
  });
});
