import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ResumoFrete, type PropsResumoFrete } from './ResumoFrete';

const freteCompleto: PropsResumoFrete = {
  tipoCarga: 'Eletrônicos',
  valorFinal: '3500.00',
  statusEntrega: 'entregue',
  coletaEm: '2026-10-22T12:00:00Z',
  entregaEm: '2026-10-23T15:30:00Z',
  statusPagamento: 'retido',
};

const freteComNulos: PropsResumoFrete = {
  tipoCarga: 'Grãos',
  valorFinal: 1200,
  statusEntrega: 'aceito',
  coletaEm: null,
  entregaEm: null,
  statusPagamento: null,
};

describe('ResumoFrete', () => {
  it('mostra tipo, valor do frete, andamento, datas e pagamento', async () => {
    await renderizar(<ResumoFrete {...freteCompleto} />);
    expect(screen.getByText('Eletrônicos')).toBeOnTheScreen();
    expect(screen.getByText('Valor do frete')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Andamento do frete')).toBeOnTheScreen();
    expect(screen.getByText('22/10/2026, 09:00')).toBeOnTheScreen();
    expect(screen.getByText('23/10/2026, 12:30')).toBeOnTheScreen();
    expect(screen.getByText('Pago, retido até a entrega')).toBeOnTheScreen();
  });

  it('pagamento null mostra "Aguardando pagamento" (D-PO-07)', async () => {
    await renderizar(<ResumoFrete {...freteComNulos} />);
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
  });

  it('datas null mostram traço, nunca "null" ou "undefined"', async () => {
    await renderizar(<ResumoFrete {...freteComNulos} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText(/null|undefined/)).toBeNull();
  });

  it.each([
    ['liberado', 'Liberado ao motorista'],
    ['estornado', 'Estornado'],
    ['pendente', 'Pendente'],
  ] as const)('pagamento %s usa o rótulo "%s"', async (statusPagamento, rotulo) => {
    await renderizar(<ResumoFrete {...freteCompleto} statusPagamento={statusPagamento} />);
    expect(screen.getByText(rotulo)).toBeOnTheScreen();
  });
});
