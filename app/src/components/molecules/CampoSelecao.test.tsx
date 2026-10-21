import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CampoSelecao } from './CampoSelecao';

const OPCOES = [
  { valor: 'mopp', rotulo: 'MOPP' },
  { valor: 'adr', rotulo: 'ADR' },
];

// No iPhone o seletor é o componente nativo `RNCPicker`; ele só recebe label, dica, itens e escolha.
// A versão web (`<select>`) é testada em CampoSelecao.dom.test.tsx.
describe('CampoSelecao (iPhone)', () => {
  it('mostra o rótulo e o seletor nativo com o nome do rótulo', async () => {
    await renderizar(
      <CampoSelecao rotulo="Certificação" opcoes={OPCOES} valor="mopp" aoMudar={() => {}} />,
    );
    expect(screen.getByText('Certificação')).toBeOnTheScreen();
    expect(screen.getByLabelText('Certificação').props.accessibilityLabel).toBe('Certificação');
  });

  it('repassa as opções e a escolha ao seletor', async () => {
    await renderizar(
      <CampoSelecao rotulo="Certificação" opcoes={OPCOES} valor="adr" aoMudar={() => {}} />,
    );
    const seletor = screen.getByLabelText('Certificação');
    expect(seletor.props.items).toEqual([
      { value: 'mopp', label: 'MOPP' },
      { value: 'adr', label: 'ADR' },
    ]);
    expect(seletor.props.selectedIndex).toBe(1);
  });

  it('escolher uma linha chama aoMudar com o valor', async () => {
    const aoMudar = jest.fn();
    await renderizar(
      <CampoSelecao rotulo="Certificação" opcoes={OPCOES} valor="mopp" aoMudar={aoMudar} />,
    );
    await fireEvent(screen.getByLabelText('Certificação'), 'change', {
      nativeEvent: { newValue: 'adr', newIndex: 1 },
    });
    expect(aoMudar).toHaveBeenCalledWith('adr');
  });

  it('textoVazio adiciona a primeira linha, sem valor', async () => {
    await renderizar(
      <CampoSelecao
        rotulo="Certificação"
        opcoes={OPCOES}
        valor=""
        aoMudar={() => {}}
        textoVazio="Selecione"
      />,
    );
    const seletor = screen.getByLabelText('Certificação');
    expect(seletor.props.items[0]).toEqual({ value: '', label: 'Selecione' });
    expect(seletor.props.selectedIndex).toBe(0);
  });

  it('erro: mensagem visível ligada ao campo e dita como dica ao VoiceOver', async () => {
    await renderizar(
      <CampoSelecao
        rotulo="Certificação"
        id="cert"
        opcoes={OPCOES}
        valor=""
        aoMudar={() => {}}
        erro="Escolha uma certificação."
      />,
    );
    expect(screen.getByText('Escolha uma certificação.').props.nativeID).toBe('cert-erro');
    expect(screen.getByLabelText('Certificação').props.accessibilityHint).toBe(
      'Escolha uma certificação.',
    );
  });

  it('desabilitado: a caixa não recebe toques e fica marcada como desabilitada', async () => {
    await renderizar(
      <CampoSelecao
        rotulo="Certificação"
        opcoes={OPCOES}
        valor="mopp"
        aoMudar={() => {}}
        desabilitado
      />,
    );
    const caixa = screen.getByLabelText('Certificação').parent?.parent;
    expect(caixa?.props.pointerEvents).toBe('none');
    expect(caixa?.props.accessibilityState).toEqual({ disabled: true });
  });
});
