import { configuracaoDoCampoPix, rotuloTipoChavePix, TIPOS_CHAVE_PIX } from './chavePix';

describe('chavePix', () => {
  it('rotula os cinco tipos em pt-BR e usa traço para o desconhecido ou vazio', () => {
    expect(TIPOS_CHAVE_PIX.map(rotuloTipoChavePix)).toEqual([
      'CPF',
      'CNPJ',
      'E-mail',
      'Telefone',
      'Chave aleatória',
    ]);
    expect(rotuloTipoChavePix('boleto')).toBe('—');
    expect(rotuloTipoChavePix(null)).toBe('—');
  });

  it('cada tipo pede o teclado certo; sem tipo, texto simples', () => {
    expect(configuracaoDoCampoPix('cpf').inputMode).toBe('numeric');
    expect(configuracaoDoCampoPix('cnpj').inputMode).toBe('numeric');
    expect(configuracaoDoCampoPix('telefone')).toMatchObject({
      inputMode: 'tel',
      autoComplete: 'tel',
    });
    expect(configuracaoDoCampoPix('email')).toMatchObject({
      inputMode: 'email',
      autoComplete: 'email',
    });
    expect(configuracaoDoCampoPix('aleatoria').inputMode).toBe('text');
    expect(configuracaoDoCampoPix('')).toMatchObject({ inputMode: 'text', autoComplete: 'off' });
  });
});
