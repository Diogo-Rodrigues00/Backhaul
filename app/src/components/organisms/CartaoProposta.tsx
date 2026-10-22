// Cartão de uma proposta recebida (PropostaCard da empresa, DS 5.2, card 021). Não busca nem envia
// nada: recebe os valores como a API devolveu e avisa a tela quando a empresa pede para aceitar ou
// recusar (a confirmação, D-PO-08, é da tela).
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Animated, Platform, View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import { Preco } from '@/components/atoms/Preco';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { ResumoMotorista, type PropsResumoMotorista } from '@/components/molecules/ResumoMotorista';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { formatarDataHora, formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import {
  rotuloStatusProposta,
  rotuloTipoProposta,
  type StatusProposta,
  type TipoProposta,
} from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoProposta {
  tipo: TipoProposta;
  /** Valor como a API devolveu (número ou texto numérico). */
  valorProposto: NumeroEntrada;
  /** Valor oferecido pela carga, para comparar com a proposta. */
  valorOferecido: NumeroEntrada;
  status: StatusProposta;
  /** ISO de `criado_em`. */
  criadoEm: string;
  motorista: Omit<PropsResumoMotorista, 'ocultarNome'>;
  /** Chegou na última atualização: etiqueta "Nova". */
  nova?: boolean;
  /** Destaque que se acalma em 2,4 s (parado, sem animação, com movimento reduzido). */
  destacar?: boolean;
  /** Mostra "Aceitar" e "Recusar" (proposta pendente de carga aberta e não vencida, CT-10). */
  podeResponder: boolean;
  /** Recebe o botão que abriu o pedido, para o diálogo devolver o foco a ele. */
  aoAceitar: (origem: View | null) => void;
  aoRecusar: (origem: View | null) => void;
  /** Raiz do cartão: a tela leva o foco para cá quando o botão que o tinha some. */
  ref?: Ref<View>;
}

// Etiqueta do status da proposta: ícone + texto, nunca só cor (D-PO-13).
const VARIANTE_STATUS: Record<StatusProposta, VarianteEtiqueta> = {
  pendente: 'neutro',
  aceita: 'ok',
  recusada: 'erro',
  expirada: 'tracejada',
};

/** Tempo em que o cartão novo fica em destaque (DS 5.2). */
export const DURACAO_DESTAQUE_MS = 2400;
const LARGURA_BASE_PRINCIPAL = 280;
const LARGURA_BASE_LATERAL = 200;

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[5],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
      overflow: 'hidden',
    } satisfies ViewStyle,
    destaque: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    } satisfies ViewStyle,
    principal: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: LARGURA_BASE_PRINCIPAL,
      minWidth: 0,
      gap: space[3],
    } satisfies ViewStyle,
    topo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space[2],
    } satisfies ViewStyle,
    lateral: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: LARGURA_BASE_LATERAL,
      minWidth: 0,
      gap: space[2],
    } satisfies ViewStyle,
    acoes: { gap: space[3], marginTop: space[2] } satisfies ViewStyle,
  } as const;
}

/**
 * Faixa de destaque do cartão novo (`bg.highlight`): existe só enquanto o cartão está em destaque,
 * começa visível e some em 2,4 s. Anima só `opacity` (DS 3.4). Com movimento reduzido não há
 * animação: a faixa fica parada pelo mesmo tempo e some de uma vez.
 */
function Destaque() {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const reduzido = useMovimentoReduzido();
  const [visivel, setVisivel] = useState(true);
  const [opacidade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduzido) {
      const relogio = setTimeout(() => setVisivel(false), DURACAO_DESTAQUE_MS);
      return () => clearTimeout(relogio);
    }
    const animacao = Animated.timing(opacidade, {
      toValue: 0,
      duration: DURACAO_DESTAQUE_MS,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacao.start(({ finished }) => {
      if (finished) setVisivel(false);
    });
    return () => animacao.stop();
  }, [reduzido, opacidade]);

  if (!visivel) return null;
  return (
    <Animated.View
      aria-hidden
      pointerEvents="none"
      testID="destaque-proposta"
      style={[estilos.destaque, { backgroundColor: colors.bg.highlight, opacity: opacidade }]}
    />
  );
}

/**
 * Proposta recebida: motorista (`h3`), tipo, valor proposto contra o oferecido, situação e, se
 * ainda dá para responder, "Aceitar" e "Recusar" com o nome do motorista no rótulo acessível
 * ("Aceitar proposta de João da Silva"): o nome é único entre os botões da lista.
 */
export function CartaoProposta({
  tipo,
  valorProposto,
  valorOferecido,
  status,
  criadoEm,
  motorista,
  nova = false,
  destacar = false,
  podeResponder,
  aoAceitar,
  aoRecusar,
  ref,
}: PropsCartaoProposta) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-motorista`;
  const refAceitar = useRef<View>(null);
  const refRecusar = useRef<View>(null);

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
      {destacar ? <Destaque /> : null}
      <View style={estilos.principal}>
        <View style={estilos.topo}>
          <Titulo nivel={3} nativeID={idTitulo}>
            {motorista.nome}
          </Titulo>
          {nova ? <Etiqueta variante="novo">Nova</Etiqueta> : null}
          <Etiqueta variante={VARIANTE_STATUS[status]}>{rotuloStatusProposta(status)}</Etiqueta>
          <Etiqueta variante="neutro" icone="send">
            {rotuloTipoProposta(tipo)}
          </Etiqueta>
        </View>
        <ResumoMotorista {...motorista} ocultarNome />
        <Texto nivel="sm" cor="secundario">{`Enviada em ${formatarDataHora(criadoEm)}`}</Texto>
      </View>
      <View style={estilos.lateral}>
        <Preco
          valor={valorProposto}
          rotulo={tipo === 'aceite' ? 'Aceita o valor' : 'Valor proposto'}
        />
        <Texto nivel="sm" cor="secundario">{`Oferecido: ${formatarMoeda(valorOferecido)}`}</Texto>
        {podeResponder ? (
          <View style={estilos.acoes}>
            <Botao
              ref={refAceitar}
              icone="check"
              bloco
              aria-label={`Aceitar proposta de ${motorista.nome}`}
              aoPressionar={() => aoAceitar(refAceitar.current)}
            >
              Aceitar
            </Botao>
            <Botao
              ref={refRecusar}
              variante="perigo"
              icone="x"
              bloco
              aria-label={`Recusar proposta de ${motorista.nome}`}
              aoPressionar={() => aoRecusar(refRecusar.current)}
            >
              Recusar
            </Botao>
          </View>
        ) : null}
      </View>
    </View>
  );
}
