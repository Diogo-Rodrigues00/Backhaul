import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useMocksProntos } from '@/lib/mocks';
import { registrarServiceWorker } from '@/lib/pwa';

import { BarraDeStatus } from '@/state/tema/BarraDeStatus';
import type { TemaVisual } from '@/state/tema/montarTema';
import { TemaProvider } from '@/state/tema/TemaProvider';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { useFontesCarregadas } from '@/theme/fontes';

// Providers de sessão e dados entram nos cards seguintes.
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
      {fontesProntas && pronto && mocksProntos ? <Slot /> : null}
    </View>
  );
}
