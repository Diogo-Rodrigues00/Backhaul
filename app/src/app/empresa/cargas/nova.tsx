import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { carregarFormularioPublicarCarga } from '@/telas/FormularioPublicarCarga.carregar';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Publicar carga (card 019, MVP-08). Só a casca (h1, cabeçalho, abas) fica no JS inicial da rota: o
// formulário, o seletor de cidades e a prévia carregam por React.lazy logo depois (ADR 0011).

function criarEstilos({ space }: TemaVisual) {
  return {
    esqueleto: { gap: space[4] } satisfies ViewStyle,
  } as const;
}

/** Enquanto o formulário chega: aviso para o leitor de tela e blocos do tamanho dos campos. */
function EsqueletoDoFormulario() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.esqueleto}>
      <Carregando texto="Carregando o formulário…" />
      <Esqueleto altura={72} />
      <Esqueleto altura={72} />
      <Esqueleto altura={72} />
    </View>
  );
}

export default function PublicarCarga() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Publicar carga"
      descricao="Quanto mais claro o prazo e a urgência, mais rápido o motorista certo aparece."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarFormularioPublicarCarga}
        carregando={<EsqueletoDoFormulario />}
      />
    </TemplateTela>
  );
}
