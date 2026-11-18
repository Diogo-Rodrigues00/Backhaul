import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CartaoCertificacaoPendente } from './CartaoCertificacaoPendente';

const NOME_CERT = 'MOPP - Classe 3 Inflamáveis';
const PROPS = {
  motorista: 'João da Silva',
  certificacao: NOME_CERT,
  numero: '123456',
  validade: '2027-05-01',
  placa: 'ABC1D23',
  enviadaEm: '2026-11-08T15:00:00.000Z',
};

describe('CartaoCertificacaoPendente', () => {
  it('mostra o motorista (h3), a certificação, o número, a validade só com a data, a placa e o envio', async () => {
    await renderizar(
      <CartaoCertificacaoPendente {...PROPS} aoAprovar={jest.fn()} aoRecusar={jest.fn()} />,
    );
    const titulo = screen.getByRole('heading', { name: 'João da Silva' });
    expect(titulo.props['aria-level']).toBe(3);
    expect(screen.getByText(NOME_CERT)).toBeOnTheScreen();
    expect(screen.getByText('123456')).toBeOnTheScreen();
    expect(screen.getByText('01/05/2027')).toBeOnTheScreen();
    expect(screen.getByText('ABC1D23')).toBeOnTheScreen();
    expect(screen.getByText('08/11/2026')).toBeOnTheScreen();
    expect(screen.queryByText(/:/)).not.toBeOnTheScreen();
  });

  it('é um article nomeado pelo motorista', async () => {
    await renderizar(
      <CartaoCertificacaoPendente {...PROPS} aoAprovar={jest.fn()} aoRecusar={jest.fn()} />,
    );
    const [artigo] = screen.container.queryAll((el) => el.props.role === 'article');
    expect(artigo).toBeDefined();
    expect(artigo!.props['aria-labelledby']).toBeTruthy();
  });

  it('"Aprovar" e "Recusar" têm nome único e chamam o pedido certo, sem decidir nada sozinhos', async () => {
    const aoAprovar = jest.fn();
    const aoRecusar = jest.fn();
    await renderizar(
      <CartaoCertificacaoPendente {...PROPS} aoAprovar={aoAprovar} aoRecusar={aoRecusar} />,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: `Aprovar ${NOME_CERT} de João da Silva` }),
    );
    expect(aoAprovar).toHaveBeenCalledTimes(1);
    expect(aoRecusar).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole('button', { name: `Recusar ${NOME_CERT} de João da Silva` }),
    );
    expect(aoRecusar).toHaveBeenCalledTimes(1);
  });

  it('texto comprido sem espaços não quebra a renderização', async () => {
    const longo = 'k'.repeat(300);
    await renderizar(
      <CartaoCertificacaoPendente
        {...PROPS}
        motorista={longo}
        numero={longo}
        aoAprovar={jest.fn()}
        aoRecusar={jest.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: longo })).toBeOnTheScreen();
  });
});
