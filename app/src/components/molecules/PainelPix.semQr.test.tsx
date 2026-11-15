// PainelPix sem QR (card 044): o Pix que a lista de fretes traz tem código e validade, mas não a imagem.
// O painel mostra o código e avisa, em texto, que o QR só aparece logo depois de gerar o Pix.
import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { PainelPix, TEXTO_SEM_QR, type PixDaTela } from './PainelPix';

const CODIGO = '00020126-codigo-da-lista';

const pixSemQr: PixDaTela = {
  copiaECola: CODIGO,
  expiraEm: new Date(Date.now() + 30 * 60_000).toISOString(),
};

describe('PainelPix sem QR (Pix da lista de fretes)', () => {
  it('mostra o código, a comissão e a validade, sem imagem de QR', async () => {
    await renderizar(
      <PainelPix
        valorFrete={3200}
        percentualComissao={5}
        valorComissao={160}
        pix={pixSemQr}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();
    expect(screen.getByText(TEXTO_SEM_QR)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/QR Code do Pix/)).toBeNull();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 160,00')).toBeOnTheScreen();
    expect(screen.getByText('Código válido até')).toBeOnTheScreen();
  });

  it('com QR, mostra a imagem com rótulo e não o texto de ausência', async () => {
    await renderizar(
      <PainelPix
        valorFrete={3200}
        percentualComissao={5}
        valorComissao={160}
        pix={{ ...pixSemQr, qrCodeBase64: 'iVBORw0KGgo=' }}
      />,
    );

    expect(screen.getByLabelText('QR Code do Pix de R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.queryByText(TEXTO_SEM_QR)).toBeNull();
  });
});
