import { lazy, Suspense, useCallback, useState, type ComponentType, type ReactNode } from 'react';

import { EstadoErro } from '@/components/molecules/EstadoErro';
import { LimiteDeErro } from '@/components/molecules/LimiteDeErro';
import { useMontado } from '@/hooks/useMontado';

export const MENSAGEM_FALHA_AO_CARREGAR_TELA = 'Não foi possível carregar esta tela.';

export interface PropsCorpoSobDemanda {
  /** Abre o corpo (`*.carregar.ts`). Chamado de novo a cada "Tentar de novo": a falha não fica memorizada. */
  carregar: () => Promise<{ default: ComponentType }>;
  /** Enquanto o código chega (e no HTML estático), com a mesma altura do corpo. */
  carregando: ReactNode;
}

/**
 * Corpo de tela que abre por `React.lazy` depois da hidratação (ADR 0011): enquanto o código chega
 * (e no HTML estático) aparece `carregando`, sem empurrar a tela. Se o chunk não baixar (sem
 * conexão, ou um deploy novo trocou os arquivos), mostra "Não foi possível carregar esta tela" com
 * "Tentar de novo", que cria um `lazy` novo e baixa de novo.
 */
export function CorpoSobDemanda({ carregar, carregando }: PropsCorpoSobDemanda) {
  const montado = useMontado();
  const [tentativa, setTentativa] = useState(0);
  // O `lazy` memoriza a falha: cada tentativa precisa de um novo.
  const [Corpo, setCorpo] = useState(() => lazy(carregar));
  const tentarDeNovo = useCallback(() => {
    setCorpo(() => lazy(carregar));
    setTentativa((n) => n + 1);
  }, [carregar]);

  if (!montado) return carregando;
  return (
    <LimiteDeErro
      key={tentativa}
      fallback={
        <EstadoErro mensagem={MENSAGEM_FALHA_AO_CARREGAR_TELA} aoTentarDeNovo={tentarDeNovo} />
      }
    >
      <Suspense fallback={carregando}>
        <Corpo />
      </Suspense>
    </LimiteDeErro>
  );
}
