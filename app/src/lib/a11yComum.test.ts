import { emitirAnuncio, ouvirAnuncios, propsDeCampo } from './a11yComum';

describe('emitirAnuncio e ouvirAnuncios', () => {
  it('entrega o texto aparado aos ouvintes', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    emitirAnuncio('  1 nova proposta  ');

    expect(ouvinte).toHaveBeenCalledWith('1 nova proposta');
    parar();
  });

  it('ignora mensagem vazia ou só com espaços', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    emitirAnuncio('');
    emitirAnuncio('   ');

    expect(ouvinte).not.toHaveBeenCalled();
    parar();
  });

  it('para de entregar depois de cancelar a assinatura', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    parar();
    emitirAnuncio('Proposta aceita');

    expect(ouvinte).not.toHaveBeenCalled();
  });

  it('entrega a todos os ouvintes ativos', () => {
    const primeiro = jest.fn();
    const segundo = jest.fn();
    const pararPrimeiro = ouvirAnuncios(primeiro);
    const pararSegundo = ouvirAnuncios(segundo);

    emitirAnuncio('Pagamento liberado');

    expect(primeiro).toHaveBeenCalledWith('Pagamento liberado');
    expect(segundo).toHaveBeenCalledWith('Pagamento liberado');
    pararPrimeiro();
    pararSegundo();
  });
});

describe('propsDeCampo (ADR 0009)', () => {
  it('associa rótulo e campo sem erro', () => {
    const props = propsDeCampo({ id: 'email', rotulo: 'E-mail' });

    expect(props.rotulo).toEqual({ nativeID: 'email-rotulo' });
    expect(props.campo).toEqual({
      nativeID: 'email',
      accessibilityLabel: 'E-mail',
      accessibilityHint: undefined,
      'aria-labelledby': 'email-rotulo',
      'aria-describedby': undefined,
      'aria-invalid': false,
    });
    expect(props.erro).toBeNull();
  });

  it('associa a mensagem de erro ao campo e marca como inválido', () => {
    const props = propsDeCampo({ id: 'cpf', rotulo: 'CPF', erro: 'Informe 11 dígitos.' });

    expect(props.campo.accessibilityHint).toBe('Informe 11 dígitos.');
    expect(props.campo['aria-describedby']).toBe('cpf-erro');
    expect(props.campo['aria-invalid']).toBe(true);
    expect(props.erro).toEqual({ nativeID: 'cpf-erro' });
  });

  it('trata erro vazio ou null como ausência de erro', () => {
    expect(propsDeCampo({ id: 'a', rotulo: 'A', erro: '' }).erro).toBeNull();
    expect(propsDeCampo({ id: 'a', rotulo: 'A', erro: null }).campo['aria-invalid']).toBe(false);
  });
});
