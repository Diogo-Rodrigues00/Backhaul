import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CampoSenha } from './CampoSenha';

describe('CampoSenha', () => {
  it('começa oculta: secureTextEntry e botão "Mostrar senha" não pressionado', async () => {
    await renderizar(<CampoSenha rotulo="Senha" />);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(botao.props['aria-pressed']).toBe(false);
    expect(screen.getByText('Mostrar')).toBeOnTheScreen();
  });

  it('o botão alterna: mostra, vira "Ocultar senha" com aria-pressed, e oculta de novo', async () => {
    await renderizar(<CampoSenha rotulo="Senha" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
    const ocultar = screen.getByRole('button', { name: 'Ocultar senha' });
    expect(ocultar.props['aria-pressed']).toBe(true);
    expect(screen.getByText('Ocultar')).toBeOnTheScreen();

    await fireEvent.press(ocultar);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeOnTheScreen();
  });

  it('o botão tem alvo de ao menos 44 px', async () => {
    await renderizar(<CampoSenha rotulo="Senha" />);
    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    const estilo = (botao.props.style ?? []) as unknown;
    const achatado = Array.isArray(estilo) ? Object.assign({}, ...estilo.flat(3)) : estilo;
    expect((achatado as { minWidth: number }).minWidth).toBeGreaterThanOrEqual(44);
  });

  it('senha atual (login): autoComplete current-password', async () => {
    await renderizar(<CampoSenha rotulo="Senha" />);
    const campo = screen.getByLabelText('Senha');
    expect(campo.props.autoComplete).toBe('current-password');
    expect(campo.props.textContentType).toBe('password');
    expect(campo.props.autoCapitalize).toBe('none');
  });

  it('nova senha (cadastro): autoComplete new-password', async () => {
    await renderizar(<CampoSenha rotulo="Senha" tipo="nova-senha" />);
    const campo = screen.getByLabelText('Senha');
    expect(campo.props.autoComplete).toBe('new-password');
    expect(campo.props.textContentType).toBe('newPassword');
  });

  it('erro e ajuda ficam associados ao campo de senha', async () => {
    await renderizar(
      <CampoSenha
        rotulo="Senha"
        id="senha"
        ajuda="Mínimo de 8 caracteres."
        erro="Use pelo menos 8 caracteres."
      />,
    );
    const campo = screen.getByLabelText('Senha');
    expect(campo.props['aria-invalid']).toBe(true);
    expect(campo.props['aria-describedby']).toBe('senha-erro senha-ajuda');
    expect(screen.getByText('Use pelo menos 8 caracteres.')).toBeOnTheScreen();
  });

  it('digitar chama onChangeText', async () => {
    const aoMudar = jest.fn();
    await renderizar(<CampoSenha rotulo="Senha" onChangeText={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo123');
    expect(aoMudar).toHaveBeenCalledWith('segredo123');
  });

  it('desabilitado: campo e botão não respondem', async () => {
    await renderizar(<CampoSenha rotulo="Senha" desabilitado />);
    expect(screen.getByLabelText('Senha').props.editable).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });
});
