import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';

import { useMocksProntos } from '@/lib/mocks';
import { registrarServiceWorker } from '@/lib/pwa';

// Providers (tema, sessão, dados) entram nos cards seguintes.
// Slot, nunca Stack/Tabs: menos JS na web (ADR 0002).
export default function LayoutRaiz() {
  // Preview da Vercel: o MSW precisa estar de pé antes de qualquer tela montar (ADR 0014).
  const mocksProntos = useMocksProntos();
  // Produção: registra o service worker depois do `load` (no-op no nativo, no preview e em dev).
  useEffect(() => {
    registrarServiceWorker();
  }, []);

  return (
    <>
      {/* Título e descrição padrão; cada tela os troca via <Head> (TemplateTela, ADR 0003). */}
      <Head>
        <title>Backhaul</title>
        <meta
          name="description"
          content="Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas."
        />
      </Head>
      {mocksProntos ? <Slot /> : null}
    </>
  );
}
