// PainelPix sem QR (card 044): o Pix que a lista de fretes traz tem código e validade, mas não a imagem.
// O texto não manda ler um QR que não existe; com `aoMostrarQr` há o botão "Mostrar QR Code".
import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { PainelPix, type PixDaTela } from './PainelPix';

const CODIGO = '00020126-codigo-da-lista';

const pixSemQr: PixDaTela = {
  copiaECola: CODIGO,
  expiraEm: new Date(Date.now() + 30 * 60_000).toISOString(),
};

const TEXTO_SEM_QR = 'Abra o app do seu banco, escolha Pix e cole o código abaixo.';

describe('PainelPix sem QR (Pix da lista de fretes)', () => {
  it('mostra o código, a comissão e a validade, sem imagem de QR e sem mandar ler QR', async () => {
    await renderizar(
      <PainelPix valorFrete={3200} percentualComissao={5} valorComissao={160} pix={pixSemQr} />,
    );

    expect(screen.getByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();
    expect(screen.getByText(TEXTO_SEM_QR)).toBeOnTheScreen();
    expect(screen.queryByText(/leia o QR Code/)).toBeNull();
    expect(screen.queryByLabelText(/QR Code do Pix/)).toBeNull();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 160,00')).toBeOnTheScreen();
    expect(screen.getByText('Código válido até')).toBeOnTheScreen();
  });

  it('com `aoMostrarQr`, oferece "Mostrar QR Code" com o nome único do cartão e chama a ação', async () => {
    const aoMostrarQr = jest.fn();
    await renderizar(
      <PainelPix
        valorFrete={3200}
        percentualComissao={5}
        valorComissao={160}
        pix={pixSemQr}
        aoMostrarQr={aoMostrarQr}
        rotuloMostrarQr="Mostrar QR Code de Grãos"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Mostrar QR Code de Grãos' }));
    expect(aoMostrarQr).toHaveBeenCalledTimes(1);
  });

  it('enquanto pede o QR, o botão mostra o carregamento; em erro, mostra a mensagem', async () => {
    await renderizar(
      <PainelPix
        valorFrete={3200}
        percentualComissao={5}
        valorComissao={160}
        pix={pixSemQr}
        aoMostrarQr={jest.fn()}
        gerandoQr
        erroQr="O QR Code não ficou disponível agora."
      />,
    );

    expect(screen.getByText('Gerando QR Code…')).toBeOnTheScreen();
    expect(screen.getByText('O QR Code não ficou disponível agora.')).toBeOnTheScreen();
  });

  it('com QR, mostra a imagem com rótulo e não o botão', async () => {
    await renderizar(
      <PainelPix
        valorFrete={3200}
        percentualComissao={5}
        valorComissao={160}
        pix={{ ...pixSemQr, qrCodeBase64: 'iVBORw0KGgo=' }}
        aoMostrarQr={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('QR Code do Pix de R$ 3.200,00')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código abaixo.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mostrar QR Code' })).toBeNull();
  });
});
