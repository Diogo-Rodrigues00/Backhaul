// Abre o painel da conversa por React.lazy no primeiro uso (ADR 0016, ADR 0011). Se o código não
// baixar (sem conexão, deploy novo), mostra "Tentar de novo" dentro do espaço da conversa, sem
// derrubar a tela. O `lazy` só é trocado numa nova tentativa: reabrir outra conversa reaproveita o
// módulo já carregado, sem piscar.
import { lazy, Suspense, useCallback, useState } from 'react';

import { Carregando } from '@/components/atoms/Carregando';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { LimiteDeErro } from '@/components/molecules/LimiteDeErro';

import { carregarPainelDaConversa } from './PainelDaConversa.carregar';
import type { PropsPainelDaConversa } from './PainelDaConversa';

export const MENSAGEM_FALHA_AO_ABRIR_CONVERSA = 'Não foi possível abrir a conversa.';

let Painel = lazy(carregarPainelDaConversa);

export function ConversaSobDemanda(props: PropsPainelDaConversa) {
  const [tentativa, setTentativa] = useState(0);
  const tentarDeNovo = useCallback(() => {
    // O `lazy` memoriza a falha: cada tentativa precisa de um novo.
    Painel = lazy(carregarPainelDaConversa);
    setTentativa((n) => n + 1);
  }, []);

  return (
    <LimiteDeErro
      key={tentativa}
      fallback={
        <EstadoErro mensagem={MENSAGEM_FALHA_AO_ABRIR_CONVERSA} aoTentarDeNovo={tentarDeNovo} />
      }
    >
      <Suspense fallback={<Carregando texto="Abrindo a conversa…" />}>
        <Painel {...props} />
      </Suspense>
    </LimiteDeErro>
  );
}
