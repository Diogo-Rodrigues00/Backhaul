import { fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';

import { moverFoco } from '@/lib/a11y';
import { renderizar } from '@/test-utils/renderComTema';

import { CampoDataPartes, type ValorDataPartes } from './CampoDataPartes';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
}));

const VAZIO: ValorDataPartes = { dia: '', mes: '', ano: '' };
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

describe('CampoDataPartes', () => {
  it('é um grupo "Validade" com três campos rotulados Dia, Mês e Ano', async () => {
    await renderizar(
      <CampoDataPartes id="v" rotulo="Validade" valor={VAZIO} aoMudar={jest.fn()} />,
    );
    const [grupo] = comPapel('group');
    expect(grupo?.props['aria-labelledby']).toBe('v-rotulo');
    expect(screen.getByText('Validade').props.nativeID).toBe('v-rotulo');
    expect(screen.getByLabelText('Dia')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mês')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ano')).toBeOnTheScreen();
    // Cada campo tem o rótulo visível ligado por aria-labelledby.
    expect(screen.getByLabelText('Dia').props['aria-labelledby']).toBe('v-dia-rotulo');
    expect(screen.getByText('Dia').props.nativeID).toBe('v-dia-rotulo');
  });

  it('teclado numérico, sem seletor de data, com 2, 2 e 4 dígitos', async () => {
    await renderizar(
      <CampoDataPartes id="v" rotulo="Validade" valor={VAZIO} aoMudar={jest.fn()} />,
    );
    for (const nome of ['Dia', 'Mês', 'Ano']) {
      expect(screen.getByLabelText(nome).props.inputMode).toBe('numeric');
    }
    expect(screen.getByLabelText('Dia').props.maxLength).toBe(2);
    expect(screen.getByLabelText('Mês').props.maxLength).toBe(2);
    expect(screen.getByLabelText('Ano').props.maxLength).toBe(4);
  });

  it('mostra o valor e devolve o objeto inteiro com a parte alterada', async () => {
    const aoMudar = jest.fn();
    await renderizar(
      <CampoDataPartes
        rotulo="Validade"
        valor={{ dia: '31', mes: '12', ano: '2027' }}
        aoMudar={aoMudar}
      />,
    );
    expect(screen.getByLabelText('Mês').props.value).toBe('12');
    await fireEvent.changeText(screen.getByLabelText('Dia'), '30');
    expect(aoMudar).toHaveBeenLastCalledWith({ dia: '30', mes: '12', ano: '2027' });
    await fireEvent.changeText(screen.getByLabelText('Ano'), '2028');
    expect(aoMudar).toHaveBeenLastCalledWith({ dia: '31', mes: '12', ano: '2028' });
  });

  it('só dígitos entram: letras, sinais e espaços são descartados', async () => {
    const aoMudar = jest.fn();
    await renderizar(<CampoDataPartes rotulo="Validade" valor={VAZIO} aoMudar={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Dia'), '3a');
    expect(aoMudar).toHaveBeenLastCalledWith({ dia: '3', mes: '', ano: '' });
    await fireEvent.changeText(screen.getByLabelText('Ano'), ' 20-27/');
    expect(aoMudar).toHaveBeenLastCalledWith({ dia: '', mes: '', ano: '2027' });
    await fireEvent.changeText(screen.getByLabelText('Mês'), 'ab');
    expect(aoMudar).toHaveBeenLastCalledWith({ dia: '', mes: '', ano: '' });
  });

  it('ajuda e erro são do grupo; as três partes ficam inválidas e apontam para o mesmo erro', async () => {
    await renderizar(
      <CampoDataPartes
        id="v"
        rotulo="Validade"
        ajuda="Exemplo: dia 31, mês 12, ano 2027."
        erro="Informe uma data válida."
        valor={VAZIO}
        aoMudar={jest.fn()}
      />,
    );
    const [grupo] = comPapel('group');
    expect(grupo?.props['aria-describedby']).toBe('v-erro v-ajuda');
    // aria-invalid não vale para role="group" (ARIA 1.2): o grupo aponta o erro por aria-describedby.
    expect(grupo?.props['aria-invalid']).toBeUndefined();
    // Uma só mensagem de erro, não uma por parte.
    expect(screen.getAllByText('Informe uma data válida.')).toHaveLength(1);
    expect(screen.getByText('Informe uma data válida.').props.nativeID).toBe('v-erro');
    for (const nome of ['Dia', 'Mês', 'Ano']) {
      const campo = screen.getByLabelText(nome);
      expect(campo.props['aria-invalid']).toBe(true);
      expect(campo.props['aria-describedby']).toBe('v-erro');
    }
  });

  it('sem erro, as partes não ficam inválidas nem apontam para o erro', async () => {
    await renderizar(
      <CampoDataPartes id="v" rotulo="Validade" ajuda="Ajuda." valor={VAZIO} aoMudar={jest.fn()} />,
    );
    const campo = screen.getByLabelText('Dia');
    expect(campo.props['aria-invalid']).toBe(false);
    expect(campo.props['aria-describedby']).toBeUndefined();
    expect(comPapel('group')[0]?.props['aria-describedby']).toBe('v-ajuda');
  });

  it('o ref leva o foco ao campo Dia', async () => {
    const ref = createRef<{ focus: () => void }>();
    await renderizar(
      <CampoDataPartes rotulo="Validade" valor={VAZIO} aoMudar={jest.fn()} ref={ref} />,
    );
    ref.current?.focus();
    expect(jest.mocked(moverFoco)).toHaveBeenCalledTimes(1);
  });

  it('desabilitado: nenhuma parte aceita digitação', async () => {
    await renderizar(
      <CampoDataPartes rotulo="Validade" valor={VAZIO} aoMudar={jest.fn()} desabilitado />,
    );
    expect(screen.getByLabelText('Ano').props.editable).toBe(false);
  });
});
