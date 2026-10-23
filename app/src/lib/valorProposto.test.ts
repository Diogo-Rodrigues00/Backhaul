import { validarValorProposto, valorPropostoComoNumero } from './valorProposto';

describe('validarValorProposto (D-PO-14)', () => {
  it.each(['3200', '3200,5', '3.200,50', '0,01', ' 15 '])('aceita "%s"', (texto) => {
    expect(validarValorProposto(texto)).toBe(true);
  });

  it('vazio pede o valor', () => {
    expect(validarValorProposto('')).toBe('Informe o valor da contraproposta.');
    expect(validarValorProposto('   ')).toBe('Informe o valor da contraproposta.');
  });

  it.each(['0', '0,00', '-1', 'abc'])('recusa "%s" (não é número maior que zero)', (texto) => {
    expect(validarValorProposto(texto)).toBe('Informe um número maior que zero.');
  });

  it('recusa "1.234": pode ser mil duzentos ou um vírgula duzentos', () => {
    expect(validarValorProposto('1.234')).toMatch(/Use vírgula para decimais/);
  });
});

describe('valorPropostoComoNumero', () => {
  it('lê pt-BR e devolve number', () => {
    expect(valorPropostoComoNumero('3.200,50')).toBe(3200.5);
    expect(valorPropostoComoNumero('3200')).toBe(3200);
    expect(valorPropostoComoNumero('x')).toBeNull();
  });
});
