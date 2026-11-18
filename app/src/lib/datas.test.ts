import {
  dataNoPassado,
  hojeLocal,
  hojeUtc,
  montarData,
  primeiraValidadeAceita,
  separarData,
} from './datas';

/** Um "agora" com dia local e dia UTC escolhidos à mão, sem depender do fuso da máquina. */
function agoraCom(local: [number, number, number], iso: string): Date {
  return {
    getFullYear: () => local[0],
    getMonth: () => local[1] - 1,
    getDate: () => local[2],
    toISOString: () => iso,
  } as unknown as Date;
}

describe('montarData', () => {
  it('monta AAAA-MM-DD com zeros à esquerda', () => {
    expect(montarData('1', '5', '2027')).toBe('2027-05-01');
    expect(montarData('31', '12', '2027')).toBe('2027-12-31');
    expect(montarData(' 05 ', '09', '2026')).toBe('2026-09-05');
  });

  it('29/02 vale em ano bissexto e não vale fora dele', () => {
    expect(montarData('29', '2', '2028')).toBe('2028-02-29');
    expect(montarData('29', '2', '2027')).toBeNull();
    // 2100 é divisível por 100 e não por 400: não é bissexto.
    expect(montarData('29', '2', '2100')).toBeNull();
    expect(montarData('29', '2', '2000')).toBe('2000-02-29');
  });

  it('recusa dia que o mês não tem', () => {
    expect(montarData('31', '4', '2027')).toBeNull();
    expect(montarData('30', '2', '2028')).toBeNull();
    expect(montarData('0', '5', '2027')).toBeNull();
    expect(montarData('32', '1', '2027')).toBeNull();
  });

  it('recusa mês fora de 1 a 12', () => {
    expect(montarData('10', '13', '2027')).toBeNull();
    expect(montarData('10', '0', '2027')).toBeNull();
  });

  it('recusa ano que não tem 4 dígitos', () => {
    expect(montarData('10', '5', '27')).toBeNull();
    expect(montarData('10', '5', '20277')).toBeNull();
    expect(montarData('10', '5', '0000')).toBeNull();
  });

  it('recusa parte vazia, com letra ou com sinal', () => {
    expect(montarData('', '5', '2027')).toBeNull();
    expect(montarData('10', '', '2027')).toBeNull();
    expect(montarData('10', '5', '')).toBeNull();
    expect(montarData('1a', '5', '2027')).toBeNull();
    expect(montarData('-1', '5', '2027')).toBeNull();
    expect(montarData('1,5', '5', '2027')).toBeNull();
    expect(montarData('123', '5', '2027')).toBeNull();
  });
});

describe('separarData', () => {
  it('divide em dia, mês e ano', () => {
    expect(separarData('2027-05-01')).toEqual({ dia: '01', mes: '05', ano: '2027' });
  });

  it('data ausente ou fora do formato: tudo vazio', () => {
    expect(separarData(null)).toEqual({ dia: '', mes: '', ano: '' });
    expect(separarData('01/05/2027')).toEqual({ dia: '', mes: '', ano: '' });
  });
});

describe('hojeLocal e dataNoPassado', () => {
  it('hojeLocal usa o dia do relógio local, com zeros', () => {
    expect(hojeLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(hojeLocal(new Date(2026, 10, 4, 0, 1))).toBe('2026-11-04');
  });

  it('hojeUtc usa o dia do instante em UTC', () => {
    expect(hojeUtc(new Date('2026-11-05T01:30:00.000Z'))).toBe('2026-11-05');
  });

  it('primeiraValidadeAceita: de dia é hoje; entre 21h e 24h em Brasília (UTC já é amanhã) é amanhã', () => {
    // Local e UTC no mesmo dia: hoje vale.
    expect(primeiraValidadeAceita(agoraCom([2026, 11, 4], '2026-11-04T15:00:00.000Z'))).toBe(
      '2026-11-04',
    );
    // 22h de 04/11 em Brasília = 01h de 05/11 em UTC: o backend já chama de 05/11.
    expect(primeiraValidadeAceita(agoraCom([2026, 11, 4], '2026-11-05T01:00:00.000Z'))).toBe(
      '2026-11-05',
    );
    // Fuso à frente de UTC (local já é o dia seguinte): vale o dia local.
    expect(primeiraValidadeAceita(agoraCom([2026, 11, 5], '2026-11-04T23:00:00.000Z'))).toBe(
      '2026-11-05',
    );
  });

  it('hoje não é passado; ontem é', () => {
    expect(dataNoPassado('2026-11-04', '2026-11-04')).toBe(false);
    expect(dataNoPassado('2026-11-05', '2026-11-04')).toBe(false);
    expect(dataNoPassado('2026-11-03', '2026-11-04')).toBe(true);
    expect(dataNoPassado('2025-12-31', '2026-01-01')).toBe(true);
  });
});
