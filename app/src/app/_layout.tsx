import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { criarQueryClient } from '@/api/consulta';
import { INTERVALO_SAUDE_MS, usePortaoServidor } from '@/api/saude';
import { RegiaoViva } from '@/components/atoms/RegiaoViva';
import { PortaoServidor } from '@/components/organisms/PortaoServidor';
import { useMocksProntos } from '@/lib/mocks';
import { registrarServiceWorker } from '@/lib/pwa';

import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { BarraDeStatus } from '@/state/tema/BarraDeStatus';
import type { TemaVisual } from '@/state/tema/montarTema';
import { TemaProvider } from '@/state/tema/TemaProvider';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { useFontesCarregadas } from '@/theme/fontes';

// Ordem dos providers (ADR 0004 e 0006): Tema → Query → Sessão → Portão do servidor (card 014).
// Slot, nunca Stack/Tabs: menos JS na web (ADR 0002).
export default function LayoutRaiz() {
  // Produção: registra o service worker depois do `load` (no-op no nativo, no preview e em dev).
  useEffect(() => {
    registrarServiceWorker();
  }, []);

  return (
    <TemaProvider>
      <Estrutura />
    </TemaProvider>
  );
}

/**
 * Cliente de dados, sessão e portão do servidor. Só montam quando tudo está pronto (o MSW do preview
 * precisa estar de pé). O portão confere `GET /saude` uma vez por abertura (ADR 0005): a sessão só é
 * restaurada depois que o servidor responde, então toda tela logada (e suas queries) já nasce com o
 * servidor acordado. Em `verificando` as telas aparecem normalmente (HTML estático e LCP intactos).
 */
function Provedores({ children }: { children: ReactNode }) {
  const [queryClient] = useState(criarQueryClient);
  const portao = usePortaoServidor();
  return (
    <QueryClientProvider client={queryClient}>
      <SessaoProvider servidorPronto={portao.estado === 'pronto'}>
        <PortaoServidor
          estado={portao.estado}
          tentativa={portao.tentativa}
          totalTentativas={portao.totalTentativas}
          intervaloSegundos={INTERVALO_SAUDE_MS / 1000}
          aoTentarDeNovo={portao.tentarDeNovo}
        >
          {children}
        </PortaoServidor>
      </SessaoProvider>
    </QueryClientProvider>
  );
}

function criarEstilos({ colors }: TemaVisual) {
  return { raiz: { flex: 1, backgroundColor: colors.bg.page } } as const;
}

function Estrutura() {
  const estilos = useEstilos(criarEstilos);
  // iPhone: espera a Barlow e a preferência de tema salva antes de mostrar o conteúdo (sem piscar
  // fonte ou tema errados). Web: sempre pronto; fonte e tema vêm do CSS e do script do +html.tsx.
  const fontesProntas = useFontesCarregadas();
  const { pronto } = useTema();
  // Preview da Vercel: o MSW precisa estar de pé antes de qualquer tela montar (ADR 0014).
  const mocksProntos = useMocksProntos();

  return (
    <View style={estilos.raiz}>
      {/* Título e descrição padrão; cada tela os troca via <Head> (TemplateTela, ADR 0003). */}
      <Head>
        <title>Backhaul</title>
        <meta
          name="description"
          content="Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas."
        />
      </Head>
      <BarraDeStatus />
      {/* Uma só região viva no app inteiro: `anunciar()` escreve aqui, sem mover o foco (ADR 0009). */}
      <RegiaoViva />
      {fontesProntas && pronto && mocksProntos ? (
        <Provedores>
          <Slot />
        </Provedores>
      ) : null}
    </View>
  );
}
