import { Slot } from 'expo-router';
import Head from 'expo-router/head';

// Providers (tema, sessão, dados) entram nos cards seguintes.
// Slot, nunca Stack/Tabs: menos JS na web (ADR 0002).
export default function LayoutRaiz() {
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
      <Slot />
    </>
  );
}
