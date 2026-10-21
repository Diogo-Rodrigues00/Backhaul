import { fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { StyleSheet, type TextInput } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CampoTexto } from './CampoTexto';

describe('CampoTexto', () => {
  it('rótulo visível e campo encontrado pelo rótulo', async () => {
    await renderizar(<CampoTexto rotulo="E-mail" />);
    expect(screen.getByText('E-mail')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
  });

  it('liga rótulo, campo e (sem erro) marca válido', async () => {
    await renderizar(<CampoTexto rotulo="E-mail" id="email" />);
    const campo = screen.getByLabelText('E-mail');
    expect(campo.props.nativeID).toBe('email');
    expect(campo.props['aria-labelledby']).toBe('email-rotulo');
    expect(campo.props['aria-invalid']).toBe(false);
    expect(campo.props['aria-describedby']).toBeUndefined();
    expect(campo.props.accessibilityHint).toBeUndefined();
  });

  it('erro: mensagem visível, aria-invalid, aria-describedby e dica para o VoiceOver', async () => {
    await renderizar(<CampoTexto rotulo="CPF" id="cpf" erro="Informe 11 dígitos." />);
    const campo = screen.getByLabelText('CPF');
    expect(screen.getByText('Informe 11 dígitos.')).toBeOnTheScreen();
    expect(campo.props['aria-invalid']).toBe(true);
    expect(campo.props['aria-describedby']).toBe('cpf-erro');
    expect(campo.props.accessibilityHint).toBe('Informe 11 dígitos.');
    // O texto do erro é o elemento citado em aria-describedby.
    expect(screen.getByText('Informe 11 dígitos.').props.nativeID).toBe('cpf-erro');
  });

  it('ajuda aparece e entra no aria-describedby, depois do erro', async () => {
    await renderizar(
      <CampoTexto
        rotulo="CPF"
        id="cpf"
        ajuda="Pode digitar com ou sem pontos."
        erro="Informe 11 dígitos."
      />,
    );
    expect(screen.getByText('Pode digitar com ou sem pontos.').props.nativeID).toBe('cpf-ajuda');
    expect(screen.getByLabelText('CPF').props['aria-describedby']).toBe('cpf-erro cpf-ajuda');
  });

  it('opcional: o rótulo diz "(opcional)" e o nome acessível também', async () => {
    await renderizar(<CampoTexto rotulo="Complemento" opcional />);
    expect(screen.getByText(/\(opcional\)/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Complemento (opcional)')).toBeOnTheScreen();
  });

  it('campo obrigatório não leva marca de opcional', async () => {
    await renderizar(<CampoTexto rotulo="Nome completo" />);
    expect(screen.queryByText(/opcional/)).not.toBeOnTheScreen();
  });

  it('repassa autoComplete, inputMode, textContentType e onSubmitEditing ao TextInput', async () => {
    const aoEnviar = jest.fn();
    await renderizar(
      <CampoTexto
        rotulo="E-mail"
        autoComplete="email"
        inputMode="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        onSubmitEditing={aoEnviar}
      />,
    );
    const campo = screen.getByLabelText('E-mail');
    expect(campo.props.autoComplete).toBe('email');
    expect(campo.props.inputMode).toBe('email');
    expect(campo.props.textContentType).toBe('emailAddress');
    expect(campo.props.autoCapitalize).toBe('none');
    await fireEvent(campo, 'submitEditing');
    expect(aoEnviar).toHaveBeenCalledTimes(1);
  });

  it('digitar chama onChangeText; foco e saída chamam onFocus e onBlur', async () => {
    const aoMudar = jest.fn();
    const aoFocar = jest.fn();
    const aoSair = jest.fn();
    await renderizar(
      <CampoTexto rotulo="Nome" onChangeText={aoMudar} onFocus={aoFocar} onBlur={aoSair} />,
    );
    const campo = screen.getByLabelText('Nome');
    await fireEvent(campo, 'focus');
    await fireEvent.changeText(campo, 'João');
    await fireEvent(campo, 'blur');
    expect(aoFocar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenCalledWith('João');
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('desabilitado: não editável e marcado como desabilitado', async () => {
    await renderizar(<CampoTexto rotulo="Cidade" desabilitado />);
    const campo = screen.getByLabelText('Cidade');
    expect(campo.props.editable).toBe(false);
    expect(campo.props['aria-disabled']).toBe(true);
  });

  it('o placeholder nunca substitui o rótulo', async () => {
    await renderizar(<CampoTexto rotulo="Nome" placeholder="João da Silva" />);
    expect(screen.getByText('Nome')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('João da Silva')).toBeOnTheScreen();
  });

  it('o ref aponta para o TextInput (o react-hook-form foca por ele)', async () => {
    const ref = createRef<TextInput>();
    await renderizar(<CampoTexto rotulo="Nome" ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe('function');
  });

  it('altura mínima de 48 px (alvo de toque) e borda de 3 px com erro', async () => {
    await renderizar(<CampoTexto rotulo="Nome" erro="Preencha este campo." />);
    const estilo = StyleSheet.flatten(screen.getByLabelText('Nome').props.style);
    expect(estilo.minHeight).toBe(48);
    expect(estilo.borderWidth).toBe(3);
  });
});
