import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CartaoFreteAdmin, type PropsCartaoFreteAdmin } from './CartaoFreteAdmin';

const BASE: PropsCartaoFreteAdmin = {
  tipoCarga: 'Grãos',
  empresa: 'Transportes Rápidos LTDA',
  motorista: 'João da Silva',
  placa: 'ABC1D23',
  valorFinal: '3500.00',
  statusEntrega: 'entregue',
  statusPagamento: 'liberado',
  valorComissao: '175.00',
  criadoEm: '2026-11-01T15:00:00.000Z',
};

describe('CartaoFreteAdmin', () => {
  it('tipo da carga em h3 e os oito fatos como a API devolveu', async () => {
    await renderizar(<CartaoFreteAdmin {...BASE} />);

    expect(screen.getByRole('heading', { name: 'Grãos' }).props['aria-level']).toBe(3);
    expect(screen.container.queryAll((el) => el.props.role === 'article')).toHaveLength(1);
    expect(screen.getByLabelText('Empresa: Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(screen.getByLabelText('Motorista: João da Silva')).toBeOnTheScreen();
    expect(screen.getByLabelText('Placa: ABC1D23')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor do frete: R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Entrega: Entregue')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão: R$ 175,00')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Criado em: 01\/11\/2026/)).toBeOnTheScreen();
  });

  it('sem pagamento: "Não pago" e "Ainda não calculada", nunca travessão', async () => {
    await renderizar(<CartaoFreteAdmin {...BASE} statusPagamento={null} valorComissao={null} />);

    expect(screen.getByLabelText('Pagamento: Não pago')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão: Ainda não calculada')).toBeOnTheScreen();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('comissão zero é um valor, não "Ainda não calculada"', async () => {
    await renderizar(<CartaoFreteAdmin {...BASE} valorComissao={0} />);

    expect(screen.getByLabelText('Comissão: R$ 0,00')).toBeOnTheScreen();
  });
});
