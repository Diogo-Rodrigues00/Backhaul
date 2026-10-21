import { calcularExpiraEm, OPCOES_PRAZO } from './prazos';

describe('OPCOES_PRAZO (D-PO-02)', () => {
  it('oferece 2, 6, 12, 24 e 48 horas com rótulos em pt-BR', () => {
    expect(OPCOES_PRAZO.map((opcao) => opcao.horas)).toEqual([2, 6, 12, 24, 48]);
    expect(OPCOES_PRAZO.map((opcao) => opcao.rotulo)).toEqual([
      'Em 2 horas',
      'Em 6 horas',
      'Em 12 horas',
      'Em 24 horas',
      'Em 48 horas',
    ]);
  });
});

describe('calcularExpiraEm', () => {
  const agora = new Date('2026-10-20T12:00:00.000Z');

  it('soma as horas a "agora" e devolve ISO', () => {
    expect(calcularExpiraEm(2, agora)).toBe('2026-10-20T14:00:00.000Z');
  });

  it('atravessa a virada do dia', () => {
    expect(calcularExpiraEm(48, agora)).toBe('2026-10-22T12:00:00.000Z');
  });

  it('aceita horas fracionárias', () => {
    expect(calcularExpiraEm(0.5, agora)).toBe('2026-10-20T12:30:00.000Z');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('recusa prazo inválido (%p)', (horas) => {
    expect(() => calcularExpiraEm(horas, agora)).toThrow(RangeError);
  });

  it('usa o relógio atual quando "agora" não é informado', () => {
    const antes = Date.now();
    const expira = Date.parse(calcularExpiraEm(1));
    expect(expira).toBeGreaterThanOrEqual(antes + 60 * 60 * 1000);
    expect(expira).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
  });
});
