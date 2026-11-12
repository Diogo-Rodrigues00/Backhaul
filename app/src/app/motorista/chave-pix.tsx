import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';
import { carregarCorpoChavePixMotorista } from '@/telas/CorpoChavePixMotorista.carregar';

// Chave Pix do motorista (card 047). Só a casca (h1, cabeçalho, abas) fica no JS inicial da rota: a
// chave atual e o formulário carregam por React.lazy logo depois (ADR 0011). Título e frase fixos:
// estão no HTML estático e são o LCP.

// Mesma altura reservada do corpo carregando: ele chega sem empurrar o resto da tela.
const ALTURA_MINIMA = 360;
const ALTURA_ESQUELETO = 112;

function criarEstilos({ space }: TemaVisual) {
  return {
    esqueleto: { minHeight: ALTURA_MINIMA, gap: space[4] } satisfies ViewStyle,
  } as const;
}

/** Enquanto o corpo chega: aviso para o leitor de tela e blocos do tamanho dos cartões. */
function EsqueletoDaChavePix() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.esqueleto}>
      <Carregando texto="Carregando sua chave Pix…" />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
    </View>
  );
}

export default function ChavePixMotorista() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Chave Pix"
      descricao="Cadastre a chave Pix que recebe o valor do frete quando você confirma a entrega."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoChavePixMotorista}
        carregando={<EsqueletoDaChavePix />}
      />
    </TemplateTela>
  );
}
