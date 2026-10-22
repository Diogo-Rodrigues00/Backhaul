import { Slot } from 'expo-router';

import { AreaProtegida } from '@/components/organisms/AreaProtegida';

// Guarda da área da empresa (ADR 0006). Slot, nunca Stack/Tabs (ADR 0002).
export default function LayoutEmpresa() {
  return (
    <AreaProtegida area="empresa">
      <Slot />
    </AreaProtegida>
  );
}
