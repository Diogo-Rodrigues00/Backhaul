import { fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { moverFoco } from '@/lib/a11y';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { DialogoConfirmacao, type PropsDialogoConfirmacao } from './DialogoConfirmacao';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));
jest.mock('@/lib/a11y', () => ({ moverFoco: jest.fn() }));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));

const reduzido = useMovimentoReduzido as jest.MockedFunction<typeof useMovimentoReduzido>;
const mover = moverFoco as jest.MockedFunction<typeof moverFoco>;

function props(extra: Partial<PropsDialogoConfirmacao> = {}): PropsDialogoConfirmacao {
  return {
    aberto: true,
    titulo: 'Aceitar proposta',
    descricao: 'Aceitar a proposta de João da Silva?',
    rotuloConfirmar: 'Aceitar proposta',
    aoConfirmar: jest.fn(),
    aoFechar: jest.fn(),
    ...extra,
  };
}

// View não é elemento de acessibilidade para o RNTL: getByRole não enxerga alertdialog nem alert.
function comPapel(papel: string) {
  const [achado] = screen.container.queryAll((el) => el.props.role === papel);
  if (!achado) throw new Error('elemento não encontrado');
  return achado;
}

function elemento(tipo: string) {
  const [achado] = screen.container.queryAll((el) => el.type === tipo);
  if (!achado) throw new Error('elemento não encontrado');
  return achado;
}

beforeEach(() => {
  reduzido.mockReturnValue(false);
  mover.mockClear();
});

describe('DialogoConfirmacao: semântica', () => {
  it('abre como alertdialog, preso ao modal, ligado ao título e à descrição', async () => {
    await renderizar(<DialogoConfirmacao {...props()} />);
    const caixa = comPapel('alertdialog');
    expect(caixa.props.accessibilityViewIsModal).toBe(true);

    const titulo = screen.getByRole('heading', { name: 'Aceitar proposta' });
    expect(titulo.props['aria-level']).toBe(2);
    const descricao = screen.getByText('Aceitar a proposta de João da Silva?');
    expect(caixa.props['aria-labelledby']).toBe(titulo.props.nativeID);
    expect(caixa.props['aria-describedby']).toBe(descricao.props.nativeID);
    expect(titulo.props.nativeID).not.toBe(descricao.props.nativeID);
  });

  it('fechado, não renderiza nada', async () => {
    await renderizar(<DialogoConfirmacao {...props({ aberto: false })} />);
    expect(screen.container.queryAll((el) => el.props.role === 'alertdialog')).toHaveLength(0);
  });

  it('mostra o conteúdo extra entre a descrição e os botões', async () => {
    await renderizar(
      <DialogoConfirmacao {...props({ children: <Text>Valor: R$ 1.200,00</Text> })} />,
    );
    expect(screen.getByText('Valor: R$ 1.200,00')).toBeOnTheScreen();
  });

  it('usa "Cancelar" por padrão e aceita outro rótulo', async () => {
    const { rerender } = await renderizar(<DialogoConfirmacao {...props()} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
    await rerender(comTema(<DialogoConfirmacao {...props({ rotuloCancelar: 'Voltar' })} />));
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });
});

describe('DialogoConfirmacao: ações', () => {
  it('confirmar chama aoConfirmar', async () => {
    const p = props();
    await renderizar(<DialogoConfirmacao {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta' }));
    expect(p.aoConfirmar).toHaveBeenCalledTimes(1);
    expect(p.aoFechar).not.toHaveBeenCalled();
  });

  it('cancelar chama aoFechar', async () => {
    const p = props();
    await renderizar(<DialogoConfirmacao {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(p.aoFechar).toHaveBeenCalledTimes(1);
    expect(p.aoConfirmar).not.toHaveBeenCalled();
  });

  it('o gesto de voltar / Esc (onRequestClose) fecha', async () => {
    const p = props();
    await renderizar(<DialogoConfirmacao {...p} />);
    await fireEvent(elemento('Modal'), 'requestClose');
    expect(p.aoFechar).toHaveBeenCalledTimes(1);
  });

  it('o perigo mantém o rótulo explícito no botão de confirmar', async () => {
    await renderizar(
      <DialogoConfirmacao
        {...props({ variante: 'perigo', rotuloConfirmar: 'Recusar proposta' })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Recusar proposta' })).toBeOnTheScreen();
  });
});

describe('DialogoConfirmacao: carregando', () => {
  it('trava os dois botões, mostra o progresso e não dispara segunda chamada', async () => {
    const p = props({ carregando: true });
    await renderizar(<DialogoConfirmacao {...p} />);

    const confirmar = screen.getByRole('button', { name: 'Enviando…' });
    expect(confirmar).toBeBusy();
    expect(confirmar).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await fireEvent.press(confirmar);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(p.aoConfirmar).not.toHaveBeenCalled();
    expect(p.aoFechar).not.toHaveBeenCalled();
  });

  it('Esc e voltar não fecham durante o envio', async () => {
    const p = props({ carregando: true });
    await renderizar(<DialogoConfirmacao {...p} />);
    await fireEvent(elemento('Modal'), 'requestClose');
    expect(p.aoFechar).not.toHaveBeenCalled();
  });

  it('um duplo toque chama aoConfirmar uma vez enquanto a Promise não termina', async () => {
    let terminar: () => void = () => {};
    const aoConfirmar = jest.fn(() => new Promise<void>((ok) => (terminar = ok)));
    await renderizar(<DialogoConfirmacao {...props({ aoConfirmar })} />);
    const confirmar = screen.getByRole('button', { name: 'Aceitar proposta' });
    await fireEvent.press(confirmar);
    await fireEvent.press(confirmar);
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    terminar();
  });

  it('aceita rótulo de progresso próprio', async () => {
    await renderizar(
      <DialogoConfirmacao {...props({ carregando: true, rotuloCarregando: 'Pagando…' })} />,
    );
    expect(screen.getByRole('button', { name: 'Pagando…' })).toBeOnTheScreen();
  });
});

describe('DialogoConfirmacao: erro', () => {
  it('mostra o erro em role="alert" e continua aberto', async () => {
    await renderizar(<DialogoConfirmacao {...props({ erro: 'Não foi possível aceitar.' })} />);
    expect(comPapel('alert')).toHaveTextContent('Não foi possível aceitar.');
    const dentro = comPapel('alertdialog').queryAll((el) => el.props.role === 'alert');
    expect(dentro).toHaveLength(1);
  });

  it('sem erro, não há alerta', async () => {
    await renderizar(<DialogoConfirmacao {...props()} />);
    expect(screen.container.queryAll((el) => el.props.role === 'alert')).toHaveLength(0);
  });
});

describe('DialogoConfirmacao: movimento reduzido', () => {
  it('anima com fade por padrão', async () => {
    await renderizar(<DialogoConfirmacao {...props()} />);
    expect(elemento('Modal').props.animationType).toBe('fade');
  });

  it('sem animação quando o usuário pede menos movimento', async () => {
    reduzido.mockReturnValue(true);
    await renderizar(<DialogoConfirmacao {...props()} />);
    expect(elemento('Modal').props.animationType).toBe('none');
  });
});

describe('DialogoConfirmacao: foco', () => {
  it('ao mostrar, o foco do VoiceOver vai ao título (iPhone)', async () => {
    await renderizar(<DialogoConfirmacao {...props()} />);
    await fireEvent(elemento('Modal'), 'show');
    expect(mover).toHaveBeenCalledTimes(1);
    const ref = mover.mock.calls[0]?.[0] as { current: { props: { accessible?: boolean } } };
    // O foco vai ao invólucro do título (acessível), não a um botão.
    expect(ref.current.props.accessible).toBe(true);
  });

  it('depois do desmonte do Modal (onDismiss), devolve o foco ao refRetorno', async () => {
    const refRetorno = createRef<unknown>();
    (refRetorno as { current: unknown }).current = {};
    await renderizar(<DialogoConfirmacao {...props({ refRetorno })} />);
    mover.mockClear();
    // Ainda aberto/saindo: nada de devolver o foco antes de o Modal sumir.
    expect(mover).not.toHaveBeenCalled();
    await fireEvent(elemento('Modal'), 'dismiss');
    expect(mover).toHaveBeenCalledTimes(1);
    expect(mover).toHaveBeenCalledWith(refRetorno);
  });
});
