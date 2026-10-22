import { act, fireEvent, screen } from '@testing-library/react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import {
  CartaoProposta,
  DURACAO_DESTAQUE_MS,
  type PropsCartaoProposta,
} from './CartaoProposta';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => 1 })),
}));

const reduzido = useMovimentoReduzido as jest.MockedFunction<typeof useMovimentoReduzido>;

function props(extra: Partial<PropsCartaoProposta> = {}): PropsCartaoProposta {
  return {
    tipo: 'contraproposta',
    valorProposto: '3200.00',
    valorOferecido: 3500,
    status: 'pendente',
    criadoEm: '2026-10-22T17:31:00.000Z',
    motorista: {
      nome: 'João da Silva',
      veiculo: 'carreta',
      placa: 'ABC1D23',
      capacidadeKg: 15000,
      certificacoes: [{ nome: 'MOPP', validade: '2027-05-01', aprovada: true }],
    },
    podeResponder: true,
    aoAceitar: jest.fn(),
    aoRecusar: jest.fn(),
    ...extra,
  };
}

function comPapel(papel: string) {
  return screen.container.queryAll((el) => el.props.role === papel);
}

beforeEach(() => reduzido.mockReturnValue(false));

describe('CartaoProposta', () => {
  it('mostra motorista (h3), tipo, status, valores e a data de envio', async () => {
    await renderizar(<CartaoProposta {...props()} />);
    const titulo = screen.getByRole('heading', { name: 'João da Silva' });
    expect(titulo.props['aria-level']).toBe(3);
    expect(screen.getByText('Contraproposta')).toBeOnTheScreen();
    expect(screen.getByText('Pendente')).toBeOnTheScreen();
    expect(screen.getByText('Valor proposto')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByText('Oferecido: R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText(/^Enviada em \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)).toBeOnTheScreen();
    expect(screen.getByText('Validade: 01/05/2027')).toBeOnTheScreen();
    // O resumo do motorista não repete o nome.
    expect(screen.getAllByText('João da Silva')).toHaveLength(1);
    const [artigo] = comPapel('article');
    expect(artigo?.props['aria-labelledby']).toBe(titulo.props.nativeID);
  });

  it('proposta que aceita o valor usa o rótulo "Aceita o valor"', async () => {
    await renderizar(<CartaoProposta {...props({ tipo: 'aceite' })} />);
    expect(screen.getAllByText('Aceita o valor').length).toBeGreaterThan(0);
    expect(screen.queryByText('Valor proposto')).not.toBeOnTheScreen();
  });

  it('Aceitar e Recusar têm nome único e avisam a tela', async () => {
    const p = props();
    await renderizar(<CartaoProposta {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }));
    expect(p.aoAceitar).toHaveBeenCalledTimes(1);
    expect(p.aoRecusar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Recusar proposta de João da Silva' }));
    expect(p.aoRecusar).toHaveBeenCalledTimes(1);
  });

  it('sem podeResponder não há botões (proposta já respondida, carga fechada ou vencida)', async () => {
    await renderizar(<CartaoProposta {...props({ podeResponder: false, status: 'aceita' })} />);
    expect(screen.getByText('Aceita')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('etiqueta "Nova" só quando é nova', async () => {
    const { rerender } = await renderizar(<CartaoProposta {...props()} />);
    expect(screen.queryByText('Nova')).not.toBeOnTheScreen();
    await rerender(comTema(<CartaoProposta {...props({ nova: true })} />));
    expect(screen.getByText('Nova')).toBeOnTheScreen();
  });

  describe('destaque da proposta nova', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const destaque = () =>
      screen.queryAllByTestId('destaque-proposta', { includeHiddenElements: true });

    it('sem destaque, nada é desenhado', async () => {
      await renderizar(<CartaoProposta {...props()} />);
      expect(destaque()).toHaveLength(0);
    });

    it('com movimento reduzido fica parado por 2,4 s e some de uma vez', async () => {
      reduzido.mockReturnValue(true);
      await renderizar(<CartaoProposta {...props({ nova: true, destacar: true })} />);
      expect(destaque()).toHaveLength(1);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DURACAO_DESTAQUE_MS - 100);
      });
      expect(destaque()).toHaveLength(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });
      expect(destaque()).toHaveLength(0);
    });

    it('com movimento permitido a faixa se acalma por animação e some', async () => {
      await renderizar(<CartaoProposta {...props({ nova: true, destacar: true })} />);
      expect(destaque()).toHaveLength(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(DURACAO_DESTAQUE_MS + 500);
      });
      expect(destaque()).toHaveLength(0);
    });
  });
});
