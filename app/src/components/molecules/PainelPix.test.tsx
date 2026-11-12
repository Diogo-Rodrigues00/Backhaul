import { fireEvent, screen } from '@testing-library/react-native';

import { anunciar } from '@/lib/a11y';
import { copiarTexto } from '@/lib/copiarTexto';
import { renderizar } from '@/test-utils/renderComTema';

import { PainelPix, type PixDaTela } from './PainelPix';

jest.mock('@/lib/a11y', () => ({
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
  esconderParaLeitor: jest.fn(),
}));
// O iPhone (plataforma do Jest) não copia por código; aqui simulamos a web.
jest.mock('@/lib/copiarTexto', () => ({
  COPIA_POR_CODIGO: true,
  copiarTexto: jest.fn(async () => true),
}));

const copiarMock = jest.mocked(copiarTexto);
const anunciarMock = jest.mocked(anunciar);

const CODIGO = '00020126580014br.gov.bcb.pix0136abcdef'.repeat(8);
const pix: PixDaTela = {
  copiaECola: CODIGO,
  qrCodeBase64: 'iVBORw0KGgo=',
  expiraEm: '2026-11-13T15:30:00.000Z',
};

const propsBase = {
  valorFrete: '3500.00',
  percentualComissao: '7.50',
  valorComissao: '262.50',
  pix,
};

beforeEach(() => {
  copiarMock.mockClear();
  anunciarMock.mockClear();
});

describe('PainelPix', () => {
  it('mostra QR com rótulo, código em texto, valor, comissão da API e validade', async () => {
    await renderizar(<PainelPix {...propsBase} />);
    expect(screen.getByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    expect(screen.getByLabelText('QR Code do Pix de R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor a pagar: R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 262,50')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Código válido até: 13\/11\/2026/)).toBeOnTheScreen();
    expect(screen.getByText('Aguardando confirmação do pagamento…')).toBeOnTheScreen();
  });

  it('o código é texto selecionável', async () => {
    await renderizar(<PainelPix {...propsBase} />);
    expect(screen.getByText(CODIGO).props.selectable).toBe(true);
  });

  it('"Copiar código Pix" copia o código e anuncia sem mover o foco', async () => {
    await renderizar(<PainelPix {...propsBase} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Copiar código Pix' }));
    expect(copiarMock).toHaveBeenCalledWith(CODIGO);
    expect(anunciarMock).toHaveBeenCalledWith('Código Pix copiado');
    expect(await screen.findByText('Código Pix copiado.')).toBeOnTheScreen();
  });

  it('falha ao copiar: anuncia o plano B (selecionar o texto)', async () => {
    copiarMock.mockResolvedValueOnce(false);
    await renderizar(<PainelPix {...propsBase} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Copiar código Pix' }));
    expect(anunciarMock).toHaveBeenCalledWith(
      'Não foi possível copiar. Selecione o código e copie.',
    );
    expect(screen.queryByText('Código Pix copiado.')).toBeNull();
  });

  it('expirado: avisa em texto, sem QR, código nem botão de copiar', async () => {
    await renderizar(<PainelPix {...propsBase} expirado />);
    expect(screen.getByText('Código Pix expirado')).toBeOnTheScreen();
    expect(screen.getByText(/Não é possível gerar outro por aqui/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/QR Code do Pix/)).toBeNull();
    expect(screen.queryByText(CODIGO)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copiar código Pix' })).toBeNull();
    expect(screen.queryByText('Aguardando confirmação do pagamento…')).toBeNull();
  });

  it('"Ocultar Pix" só aparece quando o cartão oferece recolher', async () => {
    const aoOcultar = jest.fn();
    await renderizar(<PainelPix {...propsBase} aoOcultar={aoOcultar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar Pix' }));
    expect(aoOcultar).toHaveBeenCalledTimes(1);
  });
});
