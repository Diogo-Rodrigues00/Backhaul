import { Slot } from 'expo-router';

import { AreaProtegida } from '@/components/organisms/AreaProtegida';

// Guarda da área do motorista (ADR 0006). Slot, nunca Stack/Tabs (ADR 0002).
export default function LayoutMotorista() {
  return (
    <AreaProtegida area="motorista">
      <Slot />
    </AreaProtegida>
  );
}
