import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import { renderizar } from '@/test-utils/renderComTema';

import {
  CartaoFreteEmpresa,
  TEXTO_CONFIRMAR_PAGAMENTO,
  type PropsCartaoFreteEmpresa,
} from './CartaoFreteEmpresa';

jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));

const frete: PropsCartaoFreteEmpresa = {
  id: 'frete-1',
  tipoCarga: 'Produtos inflamáveis',
  valorFinal: 3200,
  statusEntrega: 'aceito',
  coletaEm: null,
  entregaEm: null,
  statusPagamento: null,
  motorista: { nome: 'João da Silva', veiculo: 'carreta', placa: 'ABC1D23' },
  aoPagar: jest.fn(() => Promise.resolve()),
  aoConflito: jest.fn(),
};

async function montar(extra: Partial<PropsCartaoFreteEmpresa> = {}) {
  const props = {
    ...frete,
    aoPagar: jest.fn(() => Promise.resolve()),
    aoConflito: jest.fn(),
    ...extra,
  };
  await renderizar(<CartaoFreteEmpresa {...props} />);
  return props;
}

const botaoPagar = () =>
  screen.queryByRole('button', { name: 'Pagar frete de Produtos inflamáveis' });
const confirmar = () => screen.getByRole('button', { name: 'Pagar frete' });
const dialogo = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');

describe('CartaoFreteEmpresa', () => {
  it('é um article rotulado pelo h2 com o tipo da carga e mostra o motorista', async () => {
    await montar();
    const titulo = screen.getByRole('heading', { name: 'Produtos inflamáveis' });
    const [artigo] = screen.container.queryAll((el) => el.props.role === 'article');
    expect(titulo.props['aria-level']).toBe(2);
    expect(artigo?.props['aria-labelledby']).toBe(titulo.props.nativeID);
    expect(screen.getByText('João da Silva')).toBeOnTheScreen();
    expect(screen.getByLabelText('Veículo: carreta')).toBeOnTheScreen();
    expect(screen.getByLabelText('Placa: ABC1D23')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
  });

  it('"Pagar frete" só aparece com pagamento null, em qualquer status de entrega', async () => {
    await montar({ statusEntrega: 'entregue', coletaEm: '2026-10-20T12:00:00Z' });
    expect(botaoPagar()).toBeOnTheScreen();
  });

  it.each(['pendente', 'retido', 'liberado', 'estornado'] as const)(
    'pagamento %s: sem botão "Pagar frete"',
    async (status) => {
      await montar({ statusPagamento: status });
      expect(botaoPagar()).toBeNull();
    },
  );

  it('a confirmação mostra o valor final e nenhum percentual nem valor de comissão', async () => {
    await montar();
    fireEvent.press(botaoPagar()!);

    expect(
      await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' }),
    ).toBeOnTheScreen();
    expect(screen.getByText(TEXTO_CONFIRMAR_PAGAMENTO)).toBeOnTheScreen();
    expect(TEXTO_CONFIRMAR_PAGAMENTO).toBe(
      'A comissão é calculada pela plataforma após o pagamento.',
    );
    expect(screen.queryByText(/\d\s*%/)).toBeNull();
    expect(screen.queryByText(/Comissão da plataforma/)).toBeNull();
    expect(screen.queryByText(/Percentual de comissão/)).toBeNull();
  });

  it('Cancelar fecha o diálogo sem pagar', async () => {
    const props = await montar();
    fireEvent.press(botaoPagar()!);
    await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(dialogo()).toHaveLength(0));
    expect(props.aoPagar).not.toHaveBeenCalled();
  });

  it('confirmar chama aoPagar uma vez e fecha o diálogo', async () => {
    const props = await montar();
    fireEvent.press(botaoPagar()!);
    await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
    fireEvent.press(confirmar());

    await waitFor(() => expect(dialogo()).toHaveLength(0));
    expect(props.aoPagar).toHaveBeenCalledTimes(1);
    expect(props.aoConflito).not.toHaveBeenCalled();
  });

  it('409: fecha o diálogo e passa a mensagem da API para a tela', async () => {
    const aoPagar = jest.fn(() =>
      Promise.reject(
        new ErroApi({ tipo: 'mensagem', status: 409, mensagens: ['frete já foi pago'] }),
      ),
    );
    const props = await montar({ aoPagar });
    fireEvent.press(botaoPagar()!);
    await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
    fireEvent.press(confirmar());

    await waitFor(() => expect(props.aoConflito).toHaveBeenCalledWith('frete já foi pago'));
    await waitFor(() => expect(dialogo()).toHaveLength(0));
  });

  it('outra falha (500): o diálogo continua aberto com o erro em um alerta', async () => {
    const aoPagar = jest.fn(() => Promise.reject(ErroApi.falha(500)));
    const props = await montar({ aoPagar });
    fireEvent.press(botaoPagar()!);
    await screen.findByRole('heading', { name: 'Pagar o frete de R$ 3.200,00?' });
    fireEvent.press(confirmar());

    expect(await screen.findByText(MENSAGEM_FALHA)).toBeOnTheScreen();
    expect(dialogo()).toHaveLength(1);
    expect(props.aoConflito).not.toHaveBeenCalled();
  });

  it('com pagamento registrado, mostra o resumo com os valores recebidos', async () => {
    await montar({
      statusPagamento: null,
      pagamento: {
        valorFrete: 3200,
        percentualComissao: 7.5,
        valorComissao: 240,
        statusPagamento: 'retido',
      },
    });
    expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 240,00')).toBeOnTheScreen();
    expect(botaoPagar()).toBeNull();

    // Ids de rótulo únicos: o grupo do resumo e o article não podem apontar para o mesmo título.
    const [artigo] = screen.container.queryAll((el) => el.props.role === 'article');
    const [grupo] = screen.container.queryAll((el) => el.props.role === 'group');
    expect(grupo?.props['aria-labelledby']).toBeTruthy();
    expect(grupo?.props['aria-labelledby']).not.toBe(artigo?.props['aria-labelledby']);
  });

  it('a lista mais nova vence o 201: depois da entrega o frete e o resumo mostram "liberado"', async () => {
    // Achado do E2E do fluxo completo (card 030): pagou em trânsito (retido), o motorista entregou
    // e o polling trouxe `liberado`; a tela não pode continuar dizendo "retido".
    await montar({
      statusEntrega: 'entregue',
      statusPagamento: 'liberado',
      pagamento: {
        valorFrete: 3200,
        percentualComissao: 7.5,
        valorComissao: 240,
        statusPagamento: 'retido',
      },
    });
    expect(screen.queryByText('Pago, retido até a entrega')).toBeNull();
    expect(screen.getAllByText('Liberado ao motorista').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Situação do pagamento: Liberado ao motorista')).toBeOnTheScreen();
    // A comissão continua sendo a que a API devolveu no 201.
    expect(screen.getByLabelText('Comissão da plataforma: R$ 240,00')).toBeOnTheScreen();
  });
});
