// Cartão de frete da empresa (FreteCard empresa, DS 5.2): resumo do frete, quem dirige, "Pagar frete"
// com confirmação e, depois do 201, o resumo do pagamento. Não busca dados: a tela entrega o frete
// pronto e a função que paga (ADR 0003).
import { useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { TextoOculto } from '@/components/atoms/TextoOculto';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { ResumoFrete } from '@/components/molecules/ResumoFrete';
import { ResumoPagamento } from '@/components/molecules/ResumoPagamento';
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
        statusPagamento={statusPagamento}
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

      {statusPagamento === null ? (
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

      {pagamento ? (
        <ResumoPagamento
          idBase={`pagamento-${id}`}
          refTitulo={refResumo}
          valorFrete={pagamento.valorFrete}
          percentualComissao={pagamento.percentualComissao}
          valorComissao={pagamento.valorComissao}
          statusPagamento={pagamento.statusPagamento}
        />
      ) : null}

      <DialogoConfirmacao
        aberto={aberto}
        titulo={`Pagar o frete de ${formatarMoeda(valorFinal)}?`}
        descricao={TEXTO_CONFIRMAR_PAGAMENTO}
        rotuloConfirmar="Pagar frete"
        rotuloCarregando="Pagando…"
        carregando={pagando}
        erro={erro}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={pagamento ? refResumo : refBotao}
      />
    </View>
  );
}
