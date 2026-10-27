import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ResumoPagamento } from './ResumoPagamento';

describe('ResumoPagamento', () => {
  it('mostra os quatro fatos com rótulo explícito, como a API devolveu', async () => {
    await renderizar(
      <ResumoPagamento
        valorFrete="3500.00"
        percentualComissao="5.00"
        valorComissao="175.00"
        statusPagamento="retido"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor do frete: R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Percentual de comissão: 5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 175,00')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Situação do pagamento: Pago, retido até a entrega'),
    ).toBeOnTheScreen();
  });

  it('não fixa o percentual: outro valor da API aparece como veio', async () => {
    await renderizar(
      <ResumoPagamento
        valorFrete={2000}
        percentualComissao={7.5}
        valorComissao={150}
        statusPagamento="liberado"
      />,
    );
    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 150,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Situação do pagamento: Liberado ao motorista')).toBeOnTheScreen();
  });

  it('é um grupo rotulado pelo título e entrega o ref ao elemento do título', async () => {
    const ref = { current: null as unknown };
    await renderizar(
      <ResumoPagamento
        idBase="frete-1"
        refTitulo={ref as never}
        valorFrete={1}
        percentualComissao={1}
        valorComissao={1}
        statusPagamento="retido"
      />,
    );
    const [grupo] = screen.container.queryAll((el) => el.props.role === 'group');
    const titulo = screen.getByRole('heading', { name: 'Resumo do pagamento' });
    expect(grupo?.props['aria-labelledby']).toBe(titulo.props.nativeID);
    expect(titulo.props.nativeID).toBe('frete-1-titulo');
    expect(ref.current).not.toBeNull();
  });
});
