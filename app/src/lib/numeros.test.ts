import { paraNumero } from './numeros';

describe('paraNumero', () => {
  it('mantém números finitos', () => {
    expect(paraNumero(3500)).toBe(3500);
    expect(paraNumero(0)).toBe(0);
    expect(paraNumero(-2.5)).toBe(-2.5);
  });

  it('converte o texto numérico do NUMERIC do Postgres', () => {
    expect(paraNumero('3500.00')).toBe(3500);
    expect(paraNumero(' 175.5 ')).toBe(175.5);
    expect(paraNumero('8000')).toBe(8000);
  });

  it('aceita a vírgula decimal digitada em pt-BR', () => {
    expect(paraNumero('3,5')).toBe(3.5);
    expect(paraNumero('1.234,56')).toBe(1234.56);
    expect(paraNumero('0,05')).toBe(0.05);
  });

  it('devolve null para o que não é número', () => {
    expect(paraNumero('')).toBeNull();
    expect(paraNumero('   ')).toBeNull();
    expect(paraNumero('abc')).toBeNull();
    expect(paraNumero('1e3')).toBeNull();
    expect(paraNumero('0x10')).toBeNull();
    expect(paraNumero('1,2,3')).toBeNull();
    expect(paraNumero(Number.NaN)).toBeNull();
    expect(paraNumero(Infinity)).toBeNull();
    expect(paraNumero(null)).toBeNull();
    expect(paraNumero(undefined)).toBeNull();
  });
});
