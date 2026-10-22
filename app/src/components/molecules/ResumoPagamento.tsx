// Resumo do pagamento (PaymentSummary, DS 5.2): cabeçalho asfalto + fatos da transação. Tudo vem da
// resposta da API; nada aqui calcula nem presume comissão (RNF-11, D-PO-06).
import type { Ref } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { Titulo } from '@/components/atoms/Titulo';
import { formatarMoeda, formatarPercentual, type NumeroEntrada } from '@/lib/formatacao';
import { rotuloPagamento, type StatusPagamento } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { ListaDeFatos } from './ListaDeFatos';

export interface PropsResumoPagamento {
  /** `valor_frete` da resposta do pagamento. */
  valorFrete: NumeroEntrada;
  /** `percentual_comissao` da resposta, como veio (só formatado, nunca recalculado). */
  percentualComissao: NumeroEntrada;
  /** `valor_comissao` da resposta. */
  valorComissao: NumeroEntrada;
  /** `status_pagamento` da resposta. */
  statusPagamento: StatusPagamento;
  /** Alvo do foco ao registrar o pagamento (`moverFoco`); o título é o elemento focável. */
  refTitulo?: Ref<View>;
  /** Prefixo do id do título, que rotula a região. Único por resumo na tela. */
  idBase?: string;
}

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
    corpo: { padding: space[4] } satisfies ViewStyle,
  } as const;
}

/**
 * Resumo do pagamento: "Valor do frete", "Percentual de comissão", "Comissão da plataforma" e
 * "Situação do pagamento", com rótulo explícito em cada valor. Aparece só depois do 201.
 * O `refTitulo` recebe o foco (`tabIndex={-1}` na web); o leitor de tela lê o título e depois os fatos.
 */
export function ResumoPagamento({
  valorFrete,
  percentualComissao,
  valorComissao,
  statusPagamento,
  refTitulo,
  idBase = 'resumo-pagamento',
}: PropsResumoPagamento) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${idBase}-titulo`;
  const web = Platform.OS === 'web';

  return (
    <View role="group" aria-labelledby={idTitulo} style={estilos.caixa}>
      <View style={estilos.cabecalho}>
        <Icone nome="check" tamanho="destaque" cor={colors.text.onInverse} />
        <View ref={refTitulo} tabIndex={-1} accessible={!web}>
          <Titulo nivel={3} cor="sobreInverso" nativeID={idTitulo}>
            Resumo do pagamento
          </Titulo>
        </View>
      </View>
      <View style={estilos.corpo}>
        <ListaDeFatos
          itens={[
            { rotulo: 'Valor do frete', valor: formatarMoeda(valorFrete) },
            { rotulo: 'Percentual de comissão', valor: formatarPercentual(percentualComissao) },
            { rotulo: 'Comissão da plataforma', valor: formatarMoeda(valorComissao) },
            { rotulo: 'Situação do pagamento', valor: rotuloPagamento(statusPagamento) },
          ]}
        />
      </View>
    </View>
  );
}
