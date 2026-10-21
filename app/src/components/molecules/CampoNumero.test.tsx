import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CampoNumero } from './CampoNumero';

describe('CampoNumero', () => {
  it('decimal (padrão) pede o teclado decimal; inteiro pede o numérico', async () => {
    await renderizar(
      <>
        <CampoNumero rotulo="Valor (R$)" prefixo="R$" />
        <CampoNumero rotulo="Raio (km)" sufixo="km" modo="inteiro" />
      </>,
    );
    expect(screen.getByLabelText('Valor (R$)').props.inputMode).toBe('decimal');
    expect(screen.getByLabelText('Raio (km)').props.inputMode).toBe('numeric');
  });

  it('prefixo e sufixo aparecem, mas são escondidos do leitor de tela', async () => {
    await renderizar(
      <>
        <CampoNumero rotulo="Valor (R$)" prefixo="R$" />
        <CampoNumero rotulo="Peso (kg)" sufixo="kg" />
      </>,
    );
    const prefixo = screen.getByText('R$', { hidden: true });
    const sufixo = screen.getByText('kg', { hidden: true });
    expect(prefixo.parent?.props['aria-hidden']).toBe(true);
    expect(sufixo.parent?.props['aria-hidden']).toBe(true);
    expect(sufixo.parent?.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByText('R$')).not.toBeOnTheScreen();
  });

  it('o nome do campo é o rótulo (a unidade está nele), sem o prefixo', async () => {
    await renderizar(<CampoNumero rotulo="Peso (kg)" sufixo="kg" />);
    expect(screen.getByLabelText('Peso (kg)')).toBeOnTheScreen();
  });

  it('guarda o texto digitado, inclusive com vírgula', async () => {
    const aoMudar = jest.fn();
    await renderizar(<CampoNumero rotulo="Valor (R$)" prefixo="R$" onChangeText={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Valor (R$)'), '1234,50');
    expect(aoMudar).toHaveBeenCalledWith('1234,50');
  });

  it('erro: mensagem associada e aria-invalid', async () => {
    await renderizar(
      <CampoNumero
        rotulo="Peso (kg)"
        id="peso"
        sufixo="kg"
        erro="Informe um número maior que zero."
      />,
    );
    const campo = screen.getByLabelText('Peso (kg)');
    expect(campo.props['aria-invalid']).toBe(true);
    expect(campo.props['aria-describedby']).toBe('peso-erro');
    expect(screen.getByText('Informe um número maior que zero.')).toBeOnTheScreen();
  });

  it('desabilitado: não editável', async () => {
    await renderizar(<CampoNumero rotulo="Peso (kg)" sufixo="kg" desabilitado />);
    expect(screen.getByLabelText('Peso (kg)').props.editable).toBe(false);
  });
});
