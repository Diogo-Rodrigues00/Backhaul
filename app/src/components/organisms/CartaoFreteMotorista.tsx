// Cartão de frete do motorista (FreteCard, DS 5.2, card 027): empresa, resumo do frete com o andamento
// e um único botão com o próximo passo (D-PO-09). Não busca nem envia nada: a tela entrega o frete
// por props e recebe o pedido de avançar; a confirmação é do `DialogoConfirmacao` da tela.
import { useId, useRef, type Ref } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { TextoOculto } from '@/components/atoms/TextoOculto';
import { Banner } from '@/components/molecules/Banner';
import { ResumoFrete } from '@/components/molecules/ResumoFrete';
import type { NumeroEntrada } from '@/lib/formatacao';
import { proximoPassoFrete, type StatusEntrega, type StatusPagamento } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

/** Resultado da última ação neste frete: "Status atualizado" (ok) ou a mensagem da API (erro). */
export interface AvisoFrete {
  variante: 'ok' | 'erro';
  titulo?: string;
  texto: string;
}

export interface PropsCartaoFreteMotorista {
  tipoCarga: string;
  /** `empresa.razao_social`. */
  empresa: string;
  valorFinal: NumeroEntrada;
  statusEntrega: StatusEntrega;
  coletaEm: string | null;
  entregaEm: string | null;
  /** `null` = a empresa ainda não pagou (D-PO-07). */
  statusPagamento: StatusPagamento | null;
  aviso?: AvisoFrete;
  /** Pede o próximo passo; recebe o botão para o diálogo devolver o foco a ele ao cancelar. */
  aoAvancar: (origem: View | null) => void;
  /** Raiz do cartão: depois da ação o foco volta para cá, inclusive quando o botão some. */
  ref?: Ref<View>;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    acao: { alignItems: 'flex-start' } satisfies ViewStyle,
  } as const;
}

/**
 * Frete do motorista: `article` com o tipo da carga como `h2` (oculto, o `ResumoFrete` já mostra o
 * tipo), a empresa, o resumo e, enquanto houver próximo passo, o botão "Iniciar transporte" ou
 * "Confirmar entrega" (56 px) com o tipo no nome acessível, único entre os fretes da lista. Frete
 * entregue não tem botão e nenhum frete tem "Cancelar" (D-PO-09).
 */
export function CartaoFreteMotorista({
  tipoCarga,
  empresa,
  valorFinal,
  statusEntrega,
  coletaEm,
  entregaEm,
  statusPagamento,
  aviso,
  aoAvancar,
  ref,
}: PropsCartaoFreteMotorista) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-frete`;
  const refBotao = useRef<View>(null);
  const passo = proximoPassoFrete(statusEntrega);

  return (
    <View
      ref={ref}
      role="article"
      aria-labelledby={idTitulo}
      tabIndex={-1}
      style={[
        estilos.cartao,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <TextoOculto nativeID={idTitulo} role="heading" aria-level={2}>
        {tipoCarga}
      </TextoOculto>
      <Texto cor="secundario">{`Empresa: ${empresa}`}</Texto>
      <ResumoFrete
        tipoCarga={tipoCarga}
        valorFinal={valorFinal}
        statusEntrega={statusEntrega}
        coletaEm={coletaEm}
        entregaEm={entregaEm}
        statusPagamento={statusPagamento}
      />
      {passo ? (
        <View style={estilos.acao}>
          <Botao
            ref={refBotao}
            tamanho="lg"
            icone={passo.status === 'em_transito' ? 'truck' : 'package'}
            aria-label={`${passo.rotulo} de ${tipoCarga}`}
            aoPressionar={() => aoAvancar(refBotao.current)}
          >
            {passo.rotulo}
          </Botao>
        </View>
      ) : null}
      {aviso ? (
        <Banner
          variante={aviso.variante}
          titulo={aviso.titulo}
          anunciar={aviso.variante === 'erro'}
        >
          {aviso.texto}
        </Banner>
      ) : null}
    </View>
  );
}
