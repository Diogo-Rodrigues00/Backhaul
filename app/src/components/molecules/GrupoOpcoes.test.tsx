import { fireEvent, screen } from '@testing-library/react-native';
import { createRef, useState } from 'react';

import { renderizar } from '@/test-utils/renderComTema';

import { GrupoOpcoes, type OpcaoGrupo } from './GrupoOpcoes';

const PRAZOS: OpcaoGrupo[] = [
  { valor: '2', rotulo: '2 h' },
  { valor: '6', rotulo: '6 h' },
  { valor: '12', rotulo: '12 h' },
];

const URGENCIAS: OpcaoGrupo[] = [
  { valor: 'normal', rotulo: 'Normal', urgencia: 'normal' },
  { valor: 'urgente', rotulo: 'Urgente', urgencia: 'urgente' },
  { valor: 'critico', rotulo: 'Crítico', urgencia: 'critico' },
];

function Controlado({ inicial = null as string | null, opcoes = PRAZOS, aoMudar = jest.fn() }) {
  const [valor, setValor] = useState<string | null>(inicial);
  return (
    <GrupoOpcoes
      legenda="Prazo"
      opcoes={opcoes}
      valor={valor}
      aoMudar={(novo) => {
        setValor(novo);
        aoMudar(novo);
      }}
    />
  );
}

// O radiogroup é um contêiner, não um elemento acessível: o RNTL não o acha por papel.
function grupoDeRadios() {
  const grupos = screen.container.queryAll((el) => el.props.role === 'radiogroup');
  expect(grupos).toHaveLength(1);
  return grupos[0]!;
}

describe('GrupoOpcoes', () => {
  it('é um radiogroup com o nome da legenda e uma opção por radio', async () => {
    await renderizar(<Controlado />);
    const grupo = grupoDeRadios();
    expect(grupo.props.accessibilityLabel).toBe('Prazo');
    expect(grupo.props['aria-labelledby']).toBe(screen.getByText('Prazo').props.nativeID);
    expect(screen.getByText('Prazo')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: '6 h' })).toBeOnTheScreen();
  });

  it('nenhuma opção marcada no começo; tocar marca só a tocada e avisa o valor', async () => {
    const aoMudar = jest.fn();
    await renderizar(<Controlado aoMudar={aoMudar} />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);

    await fireEvent.press(screen.getByRole('radio', { name: '6 h' }));
    expect(aoMudar).toHaveBeenCalledWith('6');
    expect(screen.getByRole('radio', { name: '6 h' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '2 h' })).not.toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: '12 h' }));
    expect(screen.getByRole('radio', { name: '12 h' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '6 h' })).not.toBeChecked();
  });

  it('a opção marcada mostra um check (a seleção não é só cor)', async () => {
    await renderizar(<Controlado inicial="6" />);
    const marcada = screen.getByRole('radio', { name: '6 h' });
    const desmarcada = screen.getByRole('radio', { name: '2 h' });
    // O ícone é um <Svg>; só a opção marcada o tem.
    expect(marcada.children.length).toBe(2);
    expect(desmarcada.children.length).toBe(1);
  });

  it('variante de urgência: o selo fica dentro da opção e o nome é o rótulo', async () => {
    await renderizar(<Controlado opcoes={URGENCIAS} inicial="critico" />);
    expect(screen.getByRole('radio', { name: 'Crítico' })).toBeChecked();
    // O selo traz o texto em caixa alta e o prefixo oculto "Urgência: ".
    expect(screen.getByText('Crítico')).toBeOnTheScreen();
    expect(screen.getAllByText('Urgência: ', { hidden: true })).toHaveLength(3);
  });

  it('desabilitado: nenhuma opção responde', async () => {
    const aoMudar = jest.fn();
    await renderizar(
      <GrupoOpcoes legenda="Prazo" opcoes={PRAZOS} valor={null} aoMudar={aoMudar} desabilitado />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '6 h' }));
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: '6 h' })).toBeDisabled();
  });

  it('opção desabilitada não pode ser escolhida; as outras continuam', async () => {
    const aoMudar = jest.fn();
    await renderizar(
      <GrupoOpcoes
        legenda="Prazo"
        opcoes={[...PRAZOS.slice(0, 2), { valor: '12', rotulo: '12 h', desabilitada: true }]}
        valor={null}
        aoMudar={aoMudar}
      />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '12 h' }));
    expect(aoMudar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('radio', { name: '2 h' }));
    expect(aoMudar).toHaveBeenCalledWith('2');
  });

  it('erro e ajuda: textos visíveis e ligados ao grupo', async () => {
    await renderizar(
      <GrupoOpcoes
        legenda="Prazo"
        id="prazo"
        opcoes={PRAZOS}
        valor={null}
        aoMudar={() => {}}
        ajuda="Contado a partir de agora."
        erro="Escolha um prazo."
      />,
    );
    const grupo = grupoDeRadios();
    expect(grupo.props['aria-invalid']).toBe(true);
    expect(grupo.props['aria-describedby']).toBe('prazo-erro prazo-ajuda');
    expect(screen.getByText('Escolha um prazo.').props.nativeID).toBe('prazo-erro');
    expect(screen.getByText('Contado a partir de agora.')).toBeOnTheScreen();
  });

  it('só a opção marcada (ou a primeira) está na ordem do Tab', async () => {
    await renderizar(<Controlado inicial="6" />);
    expect(screen.getByRole('radio', { name: '6 h' }).props.tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: '2 h' }).props.tabIndex).toBe(-1);

    await renderizar(<Controlado />);
    expect(screen.getAllByRole('radio', { name: '2 h' }).at(-1)?.props.tabIndex).toBe(0);
  });

  it('o ref expõe focus()', async () => {
    const ref = createRef<{ focus: () => void }>();
    await renderizar(
      <GrupoOpcoes legenda="Prazo" opcoes={PRAZOS} valor="6" aoMudar={() => {}} ref={ref} />,
    );
    expect(() => ref.current?.focus()).not.toThrow();
    expect(typeof ref.current?.focus).toBe('function');
  });
});
