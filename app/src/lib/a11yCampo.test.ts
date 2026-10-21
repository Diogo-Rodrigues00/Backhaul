import { propsDeCampo } from './a11yCampo';

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

  it('liga a ajuda ao campo; com erro, o erro vem primeiro', () => {
    const semErro = propsDeCampo({
      id: 'senha',
      rotulo: 'Senha',
      ajuda: 'Mínimo de 8 caracteres.',
    });
    expect(semErro.ajuda).toEqual({ nativeID: 'senha-ajuda' });
    expect(semErro.campo['aria-describedby']).toBe('senha-ajuda');
    expect(semErro.campo.accessibilityHint).toBe('Mínimo de 8 caracteres.');
    expect(semErro.campo['aria-invalid']).toBe(false);

    const comErro = propsDeCampo({
      id: 'senha',
      rotulo: 'Senha',
      ajuda: 'Mínimo de 8 caracteres.',
      erro: 'Use pelo menos 8 caracteres.',
    });
    expect(comErro.campo['aria-describedby']).toBe('senha-erro senha-ajuda');
    expect(comErro.campo.accessibilityHint).toBe(
      'Use pelo menos 8 caracteres. Mínimo de 8 caracteres.',
    );
  });

  it('trata erro vazio ou null como ausência de erro', () => {
    expect(propsDeCampo({ id: 'a', rotulo: 'A', erro: '' }).erro).toBeNull();
    expect(propsDeCampo({ id: 'a', rotulo: 'A', erro: null }).campo['aria-invalid']).toBe(false);
  });
});
