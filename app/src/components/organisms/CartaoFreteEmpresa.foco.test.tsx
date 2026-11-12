// Card 046 (WCAG 2.4.3): o foco não cai no `body` quando o painel Pix some ou expira.
import { act, screen } from '@testing-library/react-native';

import { moverFoco } from '@/lib/a11y';
import { focoNoCorpo } from '@/lib/focoNoCorpo';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { CartaoFreteEmpresa, type PropsCartaoFreteEmpresa } from './CartaoFreteEmpresa';

jest.mock('@/lib/a11y', () => ({ anunciar: jest.fn(), moverFoco: jest.fn() }));
jest.mock('@/lib/focoNoCorpo', () => ({ focoNoCorpo: jest.fn() }));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));

const moverFocoMock = jest.mocked(moverFoco);
const focoNoCorpoMock = jest.mocked(focoNoCorpo);

const pagamento = {
  valorFrete: 3200,
  percentualComissao: 7.5,
  valorComissao: 240,
  statusPagamento: 'pendente' as const,
  pix: {
    copiaECola: '00020126-sandbox',
    qrCodeBase64: 'iVBORw0KGgo=',
    expiraEm: new Date(Date.now() + 30 * 60_000).toISOString(),
  },
};

const base: PropsCartaoFreteEmpresa = {
  id: 'frete-1',
  tipoCarga: 'Produtos inflamáveis',
  valorFinal: 3200,
  statusEntrega: 'aceito',
  coletaEm: null,
  entregaEm: null,
  statusPagamento: 'pendente',
  motorista: { nome: 'João da Silva', veiculo: 'carreta', placa: 'ABC1D23' },
  pagamento,
  aoPagar: jest.fn(() => Promise.resolve()),
  aoConflito: jest.fn(),
};

beforeEach(() => {
  moverFocoMock.mockClear();
  focoNoCorpoMock.mockReset();
});

describe('foco do painel Pix', () => {
  it('pagamento confirmado com o foco perdido: vai para o resumo do pagamento', async () => {
    focoNoCorpoMock.mockReturnValue(true);
    await renderizar(<CartaoFreteEmpresa {...base} />);
    expect(moverFocoMock).not.toHaveBeenCalled();

    await screen.rerender(comTema(<CartaoFreteEmpresa {...base} statusPagamento="retido" />));
    expect(screen.getByRole('heading', { name: 'Resumo do pagamento' })).toBeOnTheScreen();
    expect(moverFocoMock).toHaveBeenCalledTimes(1);
  });

  it('pagamento confirmado com o foco em outro lugar: não mexe no foco', async () => {
    focoNoCorpoMock.mockReturnValue(false);
    await renderizar(<CartaoFreteEmpresa {...base} />);
    await screen.rerender(comTema(<CartaoFreteEmpresa {...base} statusPagamento="retido" />));
    expect(moverFocoMock).not.toHaveBeenCalled();
  });

  it('Pix expirado com o foco perdido: vai para o título do painel; sem perda, não mexe', async () => {
    jest.useFakeTimers();
    try {
      focoNoCorpoMock.mockReturnValue(true);
      const quase = {
        ...pagamento,
        pix: { ...pagamento.pix, expiraEm: new Date(Date.now() + 10_000).toISOString() },
      };
      await renderizar(<CartaoFreteEmpresa {...base} pagamento={quase} />);
      expect(moverFocoMock).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(31_000);
      });
      expect(screen.getByText('Código Pix expirado')).toBeOnTheScreen();
      expect(moverFocoMock).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
