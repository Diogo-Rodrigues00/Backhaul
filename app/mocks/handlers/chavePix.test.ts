// Mock da chave Pix (card 047): a normalização e as mensagens espelham backend/src/validacao.ts.
import { validarChavePixMock } from './chavePix';

const dados = (r: ReturnType<typeof validarChavePixMock>) => (r.ok ? r.dados : null);

describe('validarChavePixMock', () => {
  it('CPF: só dígitos; confere os dígitos verificadores', () => {
    expect(
      dados(validarChavePixMock({ tipo_chave_pix: 'cpf', chave_pix: '529.982.247-25' })),
    ).toEqual({ tipo_chave_pix: 'cpf', chave_pix: '52998224725' });
    expect(validarChavePixMock({ tipo_chave_pix: 'cpf', chave_pix: '123.456.789-01' })).toEqual({
      ok: false,
      erros: ['chave_pix inválida para o tipo cpf'],
    });
  });

  it('CNPJ: só dígitos', () => {
    expect(
      dados(validarChavePixMock({ tipo_chave_pix: 'cnpj', chave_pix: '11.222.333/0001-81' }))
        ?.chave_pix,
    ).toBe('11222333000181');
    expect(
      validarChavePixMock({ tipo_chave_pix: 'cnpj', chave_pix: '11.222.333/0001-82' }).ok,
    ).toBe(false);
  });

  it('telefone: 11 dígitos, aceita +55; 10 dígitos é inválido', () => {
    expect(
      dados(validarChavePixMock({ tipo_chave_pix: 'telefone', chave_pix: '(34) 99999-1234' }))
        ?.chave_pix,
    ).toBe('34999991234');
    expect(
      dados(validarChavePixMock({ tipo_chave_pix: 'telefone', chave_pix: '+55 34 99999-1234' }))
        ?.chave_pix,
    ).toBe('34999991234');
    expect(validarChavePixMock({ tipo_chave_pix: 'telefone', chave_pix: '3499991234' }).ok).toBe(
      false,
    );
  });

  it('e-mail e chave aleatória em minúsculas; formato inválido recusa', () => {
    expect(
      dados(validarChavePixMock({ tipo_chave_pix: 'email', chave_pix: 'Joao@Exemplo.com' }))
        ?.chave_pix,
    ).toBe('joao@exemplo.com');
    expect(validarChavePixMock({ tipo_chave_pix: 'email', chave_pix: 'sem-arroba' }).ok).toBe(
      false,
    );
    expect(
      dados(
        validarChavePixMock({
          tipo_chave_pix: 'aleatoria',
          chave_pix: '123E4567-E89B-42D3-A456-426614174000',
        }),
      )?.chave_pix,
    ).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(
      validarChavePixMock({ tipo_chave_pix: 'aleatoria', chave_pix: 'qualquer-coisa' }).ok,
    ).toBe(false);
  });

  it('tipo desconhecido', () => {
    expect(validarChavePixMock({ tipo_chave_pix: 'boleto', chave_pix: 'x' })).toEqual({
      ok: false,
      erros: ['tipo_chave_pix deve ser cpf, cnpj, email, telefone, aleatoria'],
    });
  });
});
