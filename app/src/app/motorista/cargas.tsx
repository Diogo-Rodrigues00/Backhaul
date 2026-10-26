import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoCargasProximas } from '@/telas/CorpoCargasProximas.carregar';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Cargas próximas (card 024, MVP-12). Só a casca (h1, cabeçalho, abas) fica no JS inicial da rota:
// a busca, a barra de contexto e os cartões carregam por React.lazy logo depois (ADR 0011).

// Mesma altura do estado "carregando" da lista: o corpo chega sem empurrar o resto da tela.
const ALTURA_MINIMA = 360;
const ALTURA_ESQUELETO = 112;

function criarEstilos({ space }: TemaVisual) {
  return {
    esqueleto: { minHeight: ALTURA_MINIMA, gap: space[4] } satisfies ViewStyle,
  } as const;
}

/** Enquanto o corpo chega: aviso para o leitor de tela e blocos do tamanho dos cartões. */
function EsqueletoDasCargas() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.esqueleto}>
      <Carregando texto="Carregando cargas…" />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
    </View>
  );
}

export default function CargasProximas() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Cargas próximas"
      descricao="Cargas abertas perto de você, das mais urgentes para as menos."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda carregar={carregarCorpoCargasProximas} carregando={<EsqueletoDasCargas />} />
    </TemplateTela>
  );
}
