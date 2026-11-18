import { fireEvent, screen } from '@testing-library/react-native';

import { comTema, renderizar } from '@/test-utils/renderComTema';

import { CartaoCertificacao, orientacaoDaSituacao } from './CartaoCertificacao';

const NOME = 'MOPP - Classe 3 Inflamáveis';

describe('CartaoCertificacao', () => {
  it('mostra nome (h3), número, validade só com a data e a situação em texto', async () => {
    await renderizar(
      <CartaoCertificacao
        nome={NOME}
        numero="123456"
        validade="2027-05-01"
        situacao="pendente"
        aoReenviar={jest.fn()}
      />,
    );
    const titulo = screen.getByRole('heading', { name: NOME });
    expect(titulo.props['aria-level']).toBe(3);
    expect(screen.getByText('123456')).toBeOnTheScreen();
    expect(screen.getByText('01/05/2027')).toBeOnTheScreen();
    expect(screen.queryByText(/:/)).not.toBeOnTheScreen();
    expect(screen.getByText('Aguardando aprovação')).toBeOnTheScreen();
  });

  it('cada situação aparece em texto', async () => {
    const { rerender } = await renderizar(
      <CartaoCertificacao nome={NOME} numero="1" validade="2027-05-01" situacao="aprovada" />,
    );
    expect(screen.getByText('Aprovada')).toBeOnTheScreen();
    await rerender(
      comTema(
        <CartaoCertificacao nome={NOME} numero="1" validade="2025-01-10" situacao="vencida" />,
      ),
    );
    expect(screen.getByText('Vencida')).toBeOnTheScreen();
  });

  it('pendente e vencida têm "Reenviar" com o nome da certificação; aprovada não tem', async () => {
    const aoReenviar = jest.fn();
    const { rerender } = await renderizar(
      <CartaoCertificacao
        nome={NOME}
        numero="1"
        validade="2027-05-01"
        situacao="pendente"
        aoReenviar={aoReenviar}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: `Reenviar ${NOME}` }));
    expect(aoReenviar).toHaveBeenCalledTimes(1);

    await rerender(
      comTema(
        <CartaoCertificacao
          nome={NOME}
          numero="1"
          validade="2025-01-10"
          situacao="vencida"
          aoReenviar={aoReenviar}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: `Reenviar ${NOME}` })).toBeOnTheScreen();

    await rerender(
      comTema(
        <CartaoCertificacao
          nome={NOME}
          numero="1"
          validade="2027-05-01"
          situacao="aprovada"
          aoReenviar={aoReenviar}
        />,
      ),
    );
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('sem aoReenviar não há botão', async () => {
    await renderizar(
      <CartaoCertificacao nome={NOME} numero="1" validade="2025-01-10" situacao="vencida" />,
    );
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('recente: destaca em texto "Enviada agora"', async () => {
    await renderizar(
      <CartaoCertificacao
        nome={NOME}
        numero="1"
        validade="2027-05-01"
        situacao="pendente"
        recente
      />,
    );
    expect(screen.getByText('Enviada agora')).toBeOnTheScreen();
  });

  it('a orientação da vencida cita a data em que venceu', () => {
    expect(orientacaoDaSituacao('vencida', '2025-01-10')).toContain('Venceu em 10/01/2025');
    expect(orientacaoDaSituacao('aprovada', '2030-01-01')).toContain('Não precisa reenviar');
  });
});
