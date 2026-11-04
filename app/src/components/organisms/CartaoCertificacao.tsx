// Cartão de certificação do motorista (DS 5.2, card 031): nome, número, validade (só a data) e a
// situação em texto + ícone, com "Reenviar" quando a situação permite. Não busca nem envia nada: a
// tela entrega os dados por props e recebe o pedido de reenvio (ADR 0003).
import { useId, useRef, type Ref } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { formatarValidade } from '@/lib/formatacao';
import { rotuloSituacaoCertificacao, type SituacaoCertificacao } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoCertificacao {
  /** Nome da certificação do catálogo ("MOPP - Classe 3 Inflamáveis"). */
  nome: string;
  numero: string;
  /** `AAAA-MM-DD`. */
  validade: string;
  situacao: SituacaoCertificacao;
  /** Recém-enviada ou reenviada nesta sessão: destaca em texto ("Enviada agora"). */
  recente?: boolean;
  /** Pede o reenvio; recebe o botão para a tela devolver o foco a ele se precisar. Sem isto, sem botão. */
  aoReenviar?: (origem: View | null) => void;
  /** Raiz do cartão: o foco pode voltar para cá depois de uma ação. */
  ref?: Ref<View>;
}

// Situação → aparência. Sempre ícone + texto (a cor só reforça).
const ETIQUETA: Record<SituacaoCertificacao, { variante: VarianteEtiqueta; icone: NomeIcone }> = {
  pendente: { variante: 'neutro', icone: 'hourglass' },
  aprovada: { variante: 'ok', icone: 'shield-check' },
  vencida: { variante: 'erro', icone: 'clock' },
};

/** Frase de orientação sob os dados, por situação. */
export function orientacaoDaSituacao(situacao: SituacaoCertificacao, validade: string): string {
  switch (situacao) {
    case 'pendente':
      return 'O administrador ainda vai analisar este envio.';
    case 'aprovada':
      return 'Aprovada e dentro da validade. Não precisa reenviar.';
    case 'vencida':
      return `Venceu em ${formatarValidade(validade)}. Reenvie com a nova validade para o administrador aprovar de novo.`;
  }
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    topo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
    } satisfies ViewStyle,
    nome: { flexShrink: 1, flexGrow: 1, minWidth: 0 } satisfies ViewStyle,
    selos: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] } satisfies ViewStyle,
    acao: { alignItems: 'flex-start' } satisfies ViewStyle,
  } as const;
}

/**
 * Certificação do motorista: `article` com o nome em `h3`, número e validade em lista de fatos e a
 * situação em texto ("Aguardando aprovação", "Aprovada", "Vencida"). "Reenviar" aparece para
 * pendente e vencida, com o nome da certificação no nome acessível ("Reenviar MOPP - Classe 3
 * Inflamáveis"), único na lista. Aprovada e vigente não tem botão.
 */
export function CartaoCertificacao({
  nome,
  numero,
  validade,
  situacao,
  recente = false,
  aoReenviar,
  ref,
}: PropsCartaoCertificacao) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-certificacao`;
  const refBotao = useRef<View>(null);
  const etiqueta = ETIQUETA[situacao];
  const podeReenviar = situacao !== 'aprovada' && aoReenviar !== undefined;

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
      <View style={estilos.topo}>
        <Titulo nivel={3} nativeID={idTitulo} style={estilos.nome}>
          {nome}
        </Titulo>
        <View style={estilos.selos}>
          {recente ? <Etiqueta variante="novo">Enviada agora</Etiqueta> : null}
          <Etiqueta variante={etiqueta.variante} icone={etiqueta.icone}>
            {rotuloSituacaoCertificacao(situacao)}
          </Etiqueta>
        </View>
      </View>
      <ListaDeFatos
        itens={[
          { rotulo: 'Número do certificado', valor: numero },
          { rotulo: 'Validade', valor: formatarValidade(validade) },
        ]}
      />
      <Texto nivel="sm" cor="secundario">
        {orientacaoDaSituacao(situacao, validade)}
      </Texto>
      {podeReenviar ? (
        <View style={estilos.acao}>
          <Botao
            ref={refBotao}
            variante="secundario"
            icone="refresh"
            aria-label={`Reenviar ${nome}`}
            aoPressionar={() => aoReenviar(refBotao.current)}
          >
            Reenviar
          </Botao>
        </View>
      ) : null}
    </View>
  );
}
