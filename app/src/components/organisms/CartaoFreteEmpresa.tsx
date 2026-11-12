// Cartão de frete da empresa (FreteCard empresa, DS 5.2): resumo do frete, quem dirige, "Pagar frete"
// com confirmação e, depois do 201, o resumo do pagamento. Não busca dados: a tela entrega o frete
// pronto e a função que paga (ADR 0003).
import { useEffect, useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { TextoOculto } from '@/components/atoms/TextoOculto';
import { Banner } from '@/components/molecules/Banner';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { PainelPix, type PixDaTela } from '@/components/molecules/PainelPix';
import { ResumoFrete } from '@/components/molecules/ResumoFrete';
import { ResumoPagamento } from '@/components/molecules/ResumoPagamento';
import { anunciar, moverFoco } from '@/lib/a11y';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import { formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import type { StatusEntrega, StatusPagamento } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { DialogoConfirmacao } from './DialogoConfirmacao';

/** Pagamento como a API devolveu no 201 (`transacao`). Só é exibido, nunca calculado. */
export interface PagamentoRegistrado {
  valorFrete: NumeroEntrada;
  percentualComissao: NumeroEntrada;
  valorComissao: NumeroEntrada;
  statusPagamento: StatusPagamento;
  /** Cobrança Pix (só no modo de teste do servidor). Fica em estado de tela e some ao sair (card 048). */
  pix?: PixDaTela;
}

export interface PropsCartaoFreteEmpresa {
  id: string;
  tipoCarga: string;
  valorFinal: NumeroEntrada;
  statusEntrega: StatusEntrega;
  coletaEm: string | null;
  entregaEm: string | null;
  /** `null` = a empresa ainda não pagou: só então o botão "Pagar frete" aparece (D-PO-06). */
  statusPagamento: StatusPagamento | null;
  motorista: { nome: string; veiculo: string; placa: string };
  /** Pagamento feito nesta sessão: mostra o resumo com a comissão. Depois de recarregar, some (Q3). */
  pagamento?: PagamentoRegistrado;
  /** Registra o pagamento (POST). Rejeita com `ErroApi` quando a API recusa. */
  aoPagar: () => Promise<unknown>;
  /** 409 (frete já pago ou cancelado): o diálogo fecha e a tela mostra a mensagem e recarrega. */
  aoConflito: (mensagem: string) => void;
}

export const ANUNCIO_PAGAMENTO_CONFIRMADO = 'Pagamento confirmado';
export const MENSAGEM_PAGAMENTO_INDISPONIVEL = 'Serviço de pagamento indisponível, tente novamente';
export const TEXTO_PIX_SEM_CODIGO =
  'Pagamento pendente. O código Pix desta cobrança não está mais disponível nesta tela. Aguarde a confirmação do pagamento ou fale com o suporte.';
/** Confere a validade do Pix a cada 30 s enquanto o cartão está aberto. */
const INTERVALO_VALIDADE_MS = 30_000;

export const TEXTO_CONFIRMAR_PAGAMENTO = 'A comissão é calculada pela plataforma após o pagamento.';

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    motorista: { gap: space[2] } satisfies ViewStyle,
    rodape: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    } satisfies ViewStyle,
  } as const;
}

/** Mensagem do erro de pagamento: a da API quando é de negócio, senão o texto padrão. */
function mensagemDoErro(erro: unknown): string {
  // 502: o gateway Pix falhou; a API não manda texto exibível, então a mensagem é nossa.
  if (erro instanceof ErroApi && erro.status === 502) return MENSAGEM_PAGAMENTO_INDISPONIVEL;
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

/**
 * Frete da empresa: `article` com o tipo da carga num h2 oculto (o `ResumoFrete` mostra o tipo sem
 * título semântico), o motorista (nome, veículo, placa) e o pagamento. "Pagar frete" abre o diálogo
 * de confirmação, que mostra o valor final e não menciona percentual nem valor de comissão.
 */
export function CartaoFreteEmpresa({
  id,
  tipoCarga,
  valorFinal,
  statusEntrega,
  coletaEm,
  entregaEm,
  statusPagamento,
  motorista,
  pagamento,
  aoPagar,
  aoConflito,
}: PropsCartaoFreteEmpresa) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `frete-${id}-titulo`;

  const [aberto, setAberto] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [erro, setErro] = useState<string | undefined>(undefined);
  const refBotao = useRef<View>(null);
  const refResumo = useRef<View>(null);
  const refPix = useRef<View>(null);
  const refVerPix = useRef<View>(null);
  const [pixAberto, setPixAberto] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());
  // Para onde o foco vai depois de abrir ou recolher o painel Pix (ação do próprio usuário).
  const focoApos = useRef<'painel' | 'botao' | null>(null);
  // A lista é a mais recente (o polling traz o "liberado" quando o motorista entrega): vale o status
  // dela. Só logo após o 201, quando a lista ainda pode trazer `null`, vale o que a API acabou de devolver.
  const status = statusPagamento ?? pagamento?.statusPagamento ?? null;
  const pix = pagamento?.pix;
  const pendente = status === 'pendente';
  const confirmado = pix !== undefined && (status === 'retido' || status === 'liberado');
  const pixExpirado = pix !== undefined && pendente && Date.parse(pix.expiraEm) <= agora;

  // Só enquanto espera o Pix: reconfere a validade (o resto da tela já é atualizado pela lista).
  useEffect(() => {
    if (pix === undefined || !pendente) return;
    const relogio = setInterval(() => setAgora(Date.now()), INTERVALO_VALIDADE_MS);
    return () => clearInterval(relogio);
  }, [pix, pendente]);

  // "Pagamento confirmado": anuncia sem mover o foco (o foco só muda por ação do usuário).
  useEffect(() => {
    if (confirmado) anunciar(ANUNCIO_PAGAMENTO_CONFIRMADO);
  }, [confirmado]);

  useEffect(() => {
    if (focoApos.current === 'botao') moverFoco(refVerPix);
    if (focoApos.current === 'painel') moverFoco(refPix);
    focoApos.current = null;
  }, [pixAberto]);

  function alternarPix(abrir: boolean) {
    focoApos.current = abrir ? 'painel' : 'botao';
    setPixAberto(abrir);
  }

  function abrir() {
    setErro(undefined);
    setAberto(true);
  }

  async function confirmar() {
    setErro(undefined);
    setPagando(true);
    try {
      await aoPagar();
      setAberto(false);
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 409) {
        setAberto(false);
        aoConflito(mensagemDoErro(falha));
      } else {
        setErro(mensagemDoErro(falha));
      }
    } finally {
      setPagando(false);
    }
  }

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <TextoOculto nativeID={idTitulo} role="heading" aria-level={2}>
        {tipoCarga}
      </TextoOculto>
      <ResumoFrete
        tipoCarga={tipoCarga}
        valorFinal={valorFinal}
        statusEntrega={statusEntrega}
        coletaEm={coletaEm}
        entregaEm={entregaEm}
        statusPagamento={status}
      />
      <View style={estilos.motorista}>
        <Texto nivel="sm" cor="secundario">
          Motorista
        </Texto>
        <Texto nivel="lg">{motorista.nome}</Texto>
        <ListaDeFatos
          itens={[
            { rotulo: 'Veículo', valor: motorista.veiculo },
            { rotulo: 'Placa', valor: motorista.placa },
          ]}
        />
      </View>

      {status === null ? (
        <View style={estilos.rodape}>
          <Botao
            ref={refBotao}
            tamanho="lg"
            aria-label={`Pagar frete de ${tipoCarga}`}
            aoPressionar={abrir}
          >
            Pagar frete
          </Botao>
        </View>
      ) : null}

      {pagamento && pix && pendente ? (
        pixAberto ? (
          <PainelPix
            idBase={`pix-${id}`}
            refTitulo={refPix}
            valorFrete={pagamento.valorFrete}
            percentualComissao={pagamento.percentualComissao}
            valorComissao={pagamento.valorComissao}
            pix={pix}
            expirado={pixExpirado}
            aoOcultar={() => alternarPix(false)}
          />
        ) : (
          <View style={estilos.rodape}>
            <Botao
              ref={refVerPix}
              variante="secundario"
              aria-label={`Ver Pix pendente de ${tipoCarga}`}
              aoPressionar={() => alternarPix(true)}
            >
              Ver Pix pendente
            </Botao>
          </View>
        )
      ) : pagamento ? (
        <>
          {confirmado ? (
            <Banner variante="ok" titulo="Pagamento confirmado" anunciar={false}>
              O Pix foi recebido. A situação do pagamento está no resumo abaixo.
            </Banner>
          ) : null}
          <ResumoPagamento
            idBase={`pagamento-${id}`}
            refTitulo={refResumo}
            valorFrete={pagamento.valorFrete}
            percentualComissao={pagamento.percentualComissao}
            valorComissao={pagamento.valorComissao}
            statusPagamento={status ?? pagamento.statusPagamento}
          />
        </>
      ) : pendente ? (
        <Texto cor="secundario">{TEXTO_PIX_SEM_CODIGO}</Texto>
      ) : null}

      <DialogoConfirmacao
        aberto={aberto}
        titulo={`Pagar o frete de ${formatarMoeda(valorFinal)}?`}
        descricao={TEXTO_CONFIRMAR_PAGAMENTO}
        rotuloConfirmar={
          erro === MENSAGEM_PAGAMENTO_INDISPONIVEL ? 'Tentar de novo' : 'Pagar frete'
        }
        rotuloCarregando="Pagando…"
        carregando={pagando}
        erro={erro}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={pagamento ? (pix ? refPix : refResumo) : refBotao}
      />
    </View>
  );
}
