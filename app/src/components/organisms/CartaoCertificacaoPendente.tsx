// Cartão de uma certificação à espera do admin (card 032, MVP-20): quem enviou (nome e placa), qual
// certificação, número, validade (só a data) e quando foi enviada, com "Aprovar" e "Recusar". Não
// busca nem decide nada: a tela entrega os dados por props e recebe os pedidos de aprovar e recusar.
// Não recebe CPF nem CNH do motorista: o fetcher os descarta antes (privacidade).
import { useId, useRef, type Ref } from 'react';
import { Platform, View, type TextStyle, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { formatarData, formatarValidade } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoCertificacaoPendente {
  /** Nome do motorista (vira o `h3`). */
  motorista: string;
  /** Nome da certificação do catálogo ("MOPP - Classe 3 Inflamáveis"). */
  certificacao: string;
  numero: string;
  /** `AAAA-MM-DD`. */
  validade: string;
  placa: string;
  /** Instante ISO do envio; só a data aparece. */
  enviadaEm: string;
  /** Recebem o botão que abriu o diálogo, para a tela devolver o foco a ele. */
  aoAprovar: (origem: View | null) => void;
  aoRecusar: (origem: View | null) => void;
  /** Raiz do cartão: o foco pode ir para cá depois de uma decisão. */
  ref?: Ref<View>;
}

/**
 * Texto sem espaços (nome ou número comprido) não pode estourar o cartão nem a tela de 320 px
 * (WCAG 1.4.10): na web `overflow-wrap: anywhere` também reduz a largura mínima do conteúdo. No
 * iPhone o texto já quebra.
 */
const QUEBRA_ONDE_PRECISAR: TextStyle | undefined = Platform.select({
  web: { overflowWrap: 'anywhere', wordWrap: 'anywhere' } as unknown as TextStyle,
});

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] } satisfies ViewStyle,
  } as const;
}

/**
 * Certificação pendente: `article` com o nome do motorista em `h3`, os dados da certificação em lista
 * de fatos e os botões com nome único na lista ("Aprovar MOPP - Classe 3 Inflamáveis de João da
 * Silva"). A decisão só acontece depois do diálogo de confirmação, que é da tela.
 */
export function CartaoCertificacaoPendente({
  motorista,
  certificacao,
  numero,
  validade,
  placa,
  enviadaEm,
  aoAprovar,
  aoRecusar,
  ref,
}: PropsCartaoCertificacaoPendente) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-motorista`;
  const refAprovar = useRef<View>(null);
  const refRecusar = useRef<View>(null);
  const quebrando = (valor: string) => (
    <Texto peso="bold" style={QUEBRA_ONDE_PRECISAR}>
      {valor}
    </Texto>
  );

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
      <Titulo nivel={3} nativeID={idTitulo} style={QUEBRA_ONDE_PRECISAR}>
        {motorista}
      </Titulo>
      <ListaDeFatos
        itens={[
          { rotulo: 'Certificação', valor: quebrando(certificacao) },
          { rotulo: 'Número do certificado', valor: quebrando(numero) },
          { rotulo: 'Validade', valor: formatarValidade(validade) },
          { rotulo: 'Placa do veículo', valor: quebrando(placa) },
          { rotulo: 'Enviada em', valor: formatarData(enviadaEm) },
        ]}
      />
      <View style={estilos.acoes}>
        <Botao
          ref={refAprovar}
          icone="check"
          aria-label={`Aprovar ${certificacao} de ${motorista}`}
          aoPressionar={() => aoAprovar(refAprovar.current)}
        >
          Aprovar
        </Botao>
        <Botao
          ref={refRecusar}
          variante="secundario"
          icone="x"
          aria-label={`Recusar ${certificacao} de ${motorista}`}
          aoPressionar={() => aoRecusar(refRecusar.current)}
        >
          Recusar
        </Botao>
      </View>
    </View>
  );
}
