import { Slot } from 'expo-router';

// Providers (tema, sessão, dados) entram nos cards seguintes.
// Slot, nunca Stack/Tabs: menos JS na web (ADR 0002).
export default function LayoutRaiz() {
  return <Slot />;
}
