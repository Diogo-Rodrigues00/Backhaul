// Painel do Pix (card 048): QR Code, código "copia e cola", valor, comissão e validade, enquanto a
// empresa paga no app do banco. Tudo vem da resposta do POST /fretes/:id/pagamento; nada aqui calcula
// comissão (RNF-11). O código e o QR são dados de cobrança: só existem em props, nunca vão a log,
// storage nem URL (o chamador guarda em estado de tela e descarta ao sair).
import { useState, type Ref } from 'react';
import { Image, Platform, View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { anunciar } from '@/lib/a11y';
import { COPIA_POR_CODIGO, copiarTexto } from '@/lib/copiarTexto';
import {
  formatarDataHora,
  formatarMoeda,
  formatarPercentual,
  type NumeroEntrada,
} from '@/lib/formatacao';
import { QUEBRA_ONDE_PRECISAR } from '@/lib/quebraDeTexto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { colors as paleta } from '@/theme/tokens';

import { Banner } from './Banner';
import { ListaDeFatos } from './ListaDeFatos';

/** Pix como a tela o guarda (mesmos dados do `pix` da API, em camelCase). */
export interface PixDaTela {
  copiaECola: string;
  qrCodeBase64: string;
  /** ISO. */
  expiraEm: string;
}

export const ANUNCIO_PIX_COPIADO = 'Código Pix copiado';
export const ANUNCIO_PIX_NAO_COPIADO = 'Não foi possível copiar. Selecione o código e copie.';
export const TEXTO_AGUARDANDO_PIX = 'Aguardando confirmação do pagamento…';
export const TEXTO_PIX_EXPIRADO =
  'Este código Pix expirou. Não é possível gerar outro por aqui: tente de novo mais tarde ou fale com o suporte.';

export interface PropsPainelPix {
  valorFrete: NumeroEntrada;
  /** `percentual_comissao` da resposta, como veio. */
  percentualComissao: NumeroEntrada;
  valorComissao: NumeroEntrada;
  pix: PixDaTela;
  /** A validade passou: esconde QR e código e avisa em texto. */
  expirado?: boolean;
  /** Alvo do foco quando o painel abre (o título é o elemento focável). */
  refTitulo?: Ref<View>;
  /** Prefixo do id do título. Único por painel na tela. */
  idBase?: string;
  /** Recolhe o painel (o cartão passa a oferecer "Ver Pix pendente"). */
  aoOcultar?: () => void;
}

const LARGURA_QR = 240;

function criarEstilos({ border, colors, radius, space }: TemaVisual) {
  return {
    caixa: {
      borderWidth: border.width,
      borderColor: colors.border.strong,
      borderRadius: radius.lg,
      overflow: 'hidden',
    } satisfies ViewStyle,
    cabecalho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      backgroundColor: colors.bg.inverse,
    } satisfies ViewStyle,
    corpo: { padding: space[4], gap: space[4] } satisfies ViewStyle,
    // O QR fica sempre sobre fundo claro, com a margem de silêncio, também no tema escuro.
    qr: {
      width: '100%',
      maxWidth: LARGURA_QR,
      alignSelf: 'flex-start',
      padding: space[4],
      backgroundColor: paleta.light.bg.surface,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    imagem: { width: '100%', aspectRatio: 1 } satisfies ViewStyle,
    codigo: {
      padding: space[3],
      borderWidth: border.width,
      borderColor: colors.border.subtle,
      borderRadius: radius.md,
      backgroundColor: colors.bg.page,
    } satisfies ViewStyle,
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] } satisfies ViewStyle,
    espera: { flexDirection: 'row', alignItems: 'center', gap: space[2] } satisfies ViewStyle,
  } as const;
}

/**
 * Painel Pix. O QR é uma imagem com rótulo ("QR Code do Pix de R$ …"): a mesma informação está no
 * código em texto, que é selecionável. "Copiar código Pix" aparece só onde há como copiar por código
 * (web); copiar anuncia "Código Pix copiado" sem mover o foco.
 */
export function PainelPix({
  valorFrete,
  percentualComissao,
  valorComissao,
  pix,
  expirado = false,
  refTitulo,
  idBase = 'painel-pix',
  aoOcultar,
}: PropsPainelPix) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const [copiado, setCopiado] = useState(false);
  const idTitulo = `${idBase}-titulo`;
  const web = Platform.OS === 'web';

  async function copiar() {
    const ok = await copiarTexto(pix.copiaECola);
    setCopiado(ok);
    anunciar(ok ? ANUNCIO_PIX_COPIADO : ANUNCIO_PIX_NAO_COPIADO);
  }

  return (
    <View role="group" aria-labelledby={idTitulo} style={estilos.caixa}>
      <View style={estilos.cabecalho}>
        <Icone nome="banknote" tamanho="destaque" cor={colors.text.onInverse} />
        <View ref={refTitulo} tabIndex={-1} accessible={!web}>
          <Titulo nivel={3} cor="sobreInverso" nativeID={idTitulo}>
            Pagamento por Pix
          </Titulo>
        </View>
      </View>
      <View style={estilos.corpo}>
        {expirado ? (
          <Banner variante="aviso" titulo="Código Pix expirado">
            {TEXTO_PIX_EXPIRADO}
          </Banner>
        ) : (
          <>
            <Texto>
              Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código abaixo.
            </Texto>
            <View
              role="img"
              aria-label={`QR Code do Pix de ${formatarMoeda(valorFrete)}`}
              accessible
              style={estilos.qr}
            >
              <Image
                source={{ uri: `data:image/png;base64,${pix.qrCodeBase64}` }}
                style={estilos.imagem}
                resizeMode="contain"
                alt=""
                accessible={false}
              />
            </View>
            <View>
              <Texto nivel="sm" cor="secundario">
                Código Pix (copia e cola)
              </Texto>
              <View style={estilos.codigo}>
                <Texto selectable nivel="sm" style={QUEBRA_ONDE_PRECISAR}>
                  {pix.copiaECola}
                </Texto>
              </View>
            </View>
          </>
        )}

        <ListaDeFatos
          itens={[
            { rotulo: 'Valor a pagar', valor: formatarMoeda(valorFrete) },
            { rotulo: 'Percentual de comissão', valor: formatarPercentual(percentualComissao) },
            { rotulo: 'Comissão da plataforma', valor: formatarMoeda(valorComissao) },
            { rotulo: 'Código válido até', valor: formatarDataHora(pix.expiraEm) },
          ]}
        />

        {expirado ? null : (
          <>
            <View style={estilos.acoes}>
              {COPIA_POR_CODIGO ? (
                <Botao variante="secundario" aoPressionar={copiar}>
                  Copiar código Pix
                </Botao>
              ) : null}
              {aoOcultar ? (
                <Botao variante="texto" aoPressionar={aoOcultar}>
                  Ocultar Pix
                </Botao>
              ) : null}
            </View>
            {copiado ? <Texto nivel="sm">Código Pix copiado.</Texto> : null}
            {COPIA_POR_CODIGO ? null : (
              <Texto nivel="sm" cor="secundario">
                Toque e segure o código, escolha Selecionar tudo e depois Copiar.
              </Texto>
            )}
            <View style={estilos.espera}>
              <Icone nome="hourglass" tamanho="destaque" cor={colors.text.secondary} />
              <Texto cor="secundario" style={{ flexShrink: 1 }}>
                {TEXTO_AGUARDANDO_PIX}
              </Texto>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
