import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { ResumoFrete, type PropsResumoFrete } from './ResumoFrete';

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

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

  it('frete cancelado mostra a etiqueta "Cancelado" e todas as etapas pendentes', async () => {
    await renderizar(<ResumoFrete {...freteCompleto} statusEntrega="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeOnTheScreen();
    expect(screen.queryAllByText(/\(concluído\)/)).toHaveLength(0);
    expect(screen.queryAllByText(/\(etapa atual\)/)).toHaveLength(0);
  });

  it('frete cancelado não destaca o valor (Preco sem cor de destaque)', async () => {
    await renderizar(<ResumoFrete {...freteCompleto} statusEntrega="cancelado" />);
    expect(estiloDe(screen.getByText('R$ 3.500,00')).color).toBe(colors.light.text.secondary);
  });

  it('frete entregue mantém o valor com destaque', async () => {
    await renderizar(<ResumoFrete {...freteCompleto} />);
    expect(estiloDe(screen.getByText('R$ 3.500,00')).color).toBe(colors.light.text.accent);
    expect(screen.queryByText('Cancelado')).toBeNull();
  });

  it('status de fora do contrato vindo da API (ex.: em_negociacao, expirado) não quebra a tela', async () => {
    // O frete só tem os status de entrega do contrato. Um valor de outra entidade ou novo na API não
    // ganha etiqueta de cancelado, não destaca nem apaga o resto: a tela segue com o andamento pendente.
    for (const statusVindoDaApi of ['em_negociacao', 'expirado'] as const) {
      const { unmount } = await renderizar(
        <ResumoFrete {...freteCompleto} statusEntrega={statusVindoDaApi as never} />,
      );
      expect(screen.getByText('Eletrônicos')).toBeOnTheScreen();
      expect(screen.queryByText('Cancelado')).toBeNull();
      expect(estiloDe(screen.getByText('R$ 3.500,00')).color).toBe(colors.light.text.accent);
      unmount();
    }
  });
});
