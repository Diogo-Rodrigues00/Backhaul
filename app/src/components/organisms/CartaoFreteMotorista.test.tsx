import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import { CartaoFreteMotorista, type PropsCartaoFreteMotorista } from './CartaoFreteMotorista';

const base: PropsCartaoFreteMotorista = {
  tipoCarga: 'Grãos',
  empresa: 'Transportes Rápidos LTDA',
  valorFinal: 3500,
  statusEntrega: 'aceito',
  coletaEm: null,
  entregaEm: null,
  statusPagamento: null,
  aoAvancar: () => undefined,
};

async function renderizar(props: Partial<PropsCartaoFreteMotorista> = {}) {
  await renderizarComRota(<CartaoFreteMotorista {...base} {...props} />);
}

// `article` não é elemento acessível por padrão (sem `accessible`): consulta pelo `role` do host.
function artigo() {
  const [elemento] = screen.container.queryAll((el) => el.props.role === 'article');
  if (!elemento) throw new Error('article não encontrado');
  return elemento;
}

describe('CartaoFreteMotorista', () => {
  it('é um article rotulado pelo h2 com o tipo da carga e mostra a empresa e o valor final', async () => {
    await renderizar();
    const titulo = screen.getByRole('heading', { name: 'Grãos' });
    expect(titulo.props['aria-level']).toBe(2);
    expect(artigo().props['aria-labelledby']).toBe(titulo.props.nativeID);
    expect(screen.getByText('Empresa: Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
  });

  it('"—" nas datas ainda não preenchidas e o rótulo de pagamento de cada situação (D-PO-07)', async () => {
    await renderizar();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
  });

  it.each([
    ['retido', 'Pago, retido até a entrega'],
    ['liberado', 'Liberado ao motorista'],
  ] as const)('pagamento %s mostra "%s"', async (statusPagamento, rotulo) => {
    await renderizar({ statusPagamento });
    expect(screen.getByText(rotulo)).toBeOnTheScreen();
  });

  it('aceito: um botão "Iniciar transporte", com o tipo no nome acessível', async () => {
    await renderizar({ statusEntrega: 'aceito' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Iniciar transporte de Grãos' })).toBeOnTheScreen();
  });

  it('em trânsito: um botão "Confirmar entrega"', async () => {
    await renderizar({ statusEntrega: 'em_transito' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Confirmar entrega de Grãos' })).toBeOnTheScreen();
  });

  it.each(['entregue', 'cancelado'] as const)(
    'frete %s: nenhum botão; nunca há botão de cancelar (D-PO-09)',
    async (statusEntrega) => {
      await renderizar({ statusEntrega });
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(screen.queryByText(/cancelar/i)).not.toBeOnTheScreen();
    },
  );

  it('o botão tem 56 px de altura (tamanho principal do motorista)', async () => {
    await renderizar();
    const botao = screen.getByRole('button', { name: 'Iniciar transporte de Grãos' });
    const estilo = StyleSheet.flatten(botao.props.style as never) as { minHeight?: number };
    expect(estilo.minHeight).toBe(56);
  });

  it('o toque devolve o botão que abriu o pedido', async () => {
    const aoAvancar = jest.fn();
    await renderizar({ aoAvancar });
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar transporte de Grãos' }));
    expect(aoAvancar).toHaveBeenCalledTimes(1);
  });

  it('aviso de sucesso é texto sem região viva; o de erro é um alerta', async () => {
    await renderizar({
      aviso: { variante: 'ok', titulo: 'Status atualizado.', texto: 'Em trânsito.' },
    });
    expect(screen.getByText('Status atualizado.')).toBeOnTheScreen();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.container.queryAll((el) => el.props.role === 'status')).toHaveLength(0);
  });

  it('aviso de erro usa role="alert"', async () => {
    await renderizar({ aviso: { variante: 'erro', texto: 'não é possível mudar o frete' } });
    expect(screen.getByText('não é possível mudar o frete')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'alert')).toHaveLength(1);
  });
});
