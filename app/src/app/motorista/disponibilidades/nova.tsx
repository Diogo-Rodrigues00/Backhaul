import { lazy, Suspense, useSyncExternalStore } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { carregarFormularioPublicarDisponibilidade } from '@/telas/FormularioPublicarDisponibilidade.carregar';

// Publicar disponibilidade (card 023, MVP-10). Só a casca (h1, cabeçalho, abas) fica no JS inicial
// da rota: o formulário e o seletor de cidades carregam por React.lazy logo depois (ADR 0011).
const Formulario = lazy(carregarFormularioPublicarDisponibilidade);

// `false` no HTML estático e na hidratação, `true` depois: o servidor não renderiza o `lazy` (o React
// acusaria o erro 419 de Suspense no servidor), só o esqueleto.
const semAssinatura = () => () => undefined;

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

export default function PublicarDisponibilidade() {
  const { cabecalho, abas } = useCasca();
  const montado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  return (
    <TemplateTela
      titulo="Publicar disponibilidade"
      descricao="Avise onde você está livre. As cargas perto de você aparecem em seguida."
      cabecalho={cabecalho}
      abas={abas}
    >
      {montado ? (
        <Suspense fallback={<EsqueletoDoFormulario />}>
          <Formulario />
        </Suspense>
      ) : (
        <EsqueletoDoFormulario />
      )}
    </TemplateTela>
  );
}
