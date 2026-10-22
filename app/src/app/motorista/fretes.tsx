import { lazy, Suspense, useSyncExternalStore } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoMeusFretesMotorista } from '@/telas/CorpoMeusFretesMotorista.carregar';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Meus fretes do motorista (MVP-16, card 027). Só a casca (h1, cabeçalho, abas) fica no JS inicial
// da rota: a lista, a atualização automática e o diálogo de confirmação carregam por React.lazy logo
// depois (ADR 0011). Título e frase fixos: estão no HTML estático e são o LCP.
const Corpo = lazy(carregarCorpoMeusFretesMotorista);

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
function EsqueletoDosFretes() {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.esqueleto}>
      <Carregando texto="Carregando fretes…" />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
      <Esqueleto altura={ALTURA_ESQUELETO} />
    </View>
  );
}

export default function MeusFretes() {
  const { cabecalho, abas } = useCasca();
  const montado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  return (
    <TemplateTela
      titulo="Meus fretes"
      descricao="Acompanhe cada frete, inicie o transporte e confirme a entrega."
      cabecalho={cabecalho}
      abas={abas}
    >
      {montado ? (
        <Suspense fallback={<EsqueletoDosFretes />}>
          <Corpo />
        </Suspense>
      ) : (
        <EsqueletoDosFretes />
      )}
    </TemplateTela>
  );
}
