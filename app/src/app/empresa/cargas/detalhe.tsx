import { lazy, Suspense, useSyncExternalStore } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoPropostasDaCarga } from '@/telas/CorpoPropostasDaCarga.carregar';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Propostas da carga (card 021, MVP-14), em `/empresa/cargas/detalhe?id=<uuid>` (ADR 0002). Só a
// casca (h1, cabeçalho, abas) fica no JS inicial da rota: o resumo, a lista de propostas, a
// atualização automática e os diálogos carregam por React.lazy logo depois (ADR 0011).
const Corpo = lazy(carregarCorpoPropostasDaCarga);

// `false` no HTML estático e na hidratação, `true` depois: o servidor não renderiza o `lazy` (o React
// acusaria o erro 419 de Suspense no servidor), só o esqueleto.
const semAssinatura = () => () => undefined;

// Mesma altura do estado "carregando" da lista: o corpo chega sem empurrar o resto da tela.
const ALTURA_MINIMA = 360;
const ALTURA_ESQUELETO = 112;

function criarEstilos({ space }: TemaVisual) {
  return {
    esqueleto: { minHeight: ALTURA_MINIMA, gap: space[4] } satisfies ViewStyle,
  } as const;
}

/** Enquanto o corpo chega: aviso para o leitor de tela e blocos do tamanho dos cartões. */
function EsqueletoDasPropostas() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.esqueleto}>
      <Carregando texto="Carregando propostas…" />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
    </View>
  );
}

export default function PropostasDaCarga() {
  const { cabecalho, abas } = useCasca();
  const montado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  return (
    <TemplateTela
      titulo="Propostas da carga"
      descricao="Veja quem quer levar a sua carga e aceite ou recuse cada proposta."
      cabecalho={cabecalho}
      abas={abas}
    >
      {montado ? (
        <Suspense fallback={<EsqueletoDasPropostas />}>
          <Corpo />
        </Suspense>
      ) : (
        <EsqueletoDasPropostas />
      )}
    </TemplateTela>
  );
}
