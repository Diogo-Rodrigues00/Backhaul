import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { View } from 'react-native';

import { BarraDeStatus } from '@/state/tema/BarraDeStatus';
import type { TemaVisual } from '@/state/tema/montarTema';
import { TemaProvider } from '@/state/tema/TemaProvider';
import { useEstilos } from '@/state/tema/useEstilos';
import { useFontesCarregadas } from '@/theme/fontes';

// Providers de sessão e dados entram nos cards seguintes.
// Slot, nunca Stack/Tabs: menos JS na web (ADR 0002).
export default function LayoutRaiz() {
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
  // iPhone: espera a Barlow antes de mostrar o conteúdo (evita trocar de fonte à vista).
  // Web: sempre pronto; a fonte vem do CSS global.
  const fontesProntas = useFontesCarregadas();

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
      {fontesProntas ? <Slot /> : null}
    </View>
  );
}
