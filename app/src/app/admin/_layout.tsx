import { Slot } from 'expo-router';

import { AreaProtegida } from '@/components/organisms/AreaProtegida';

// Guarda da área do administrador (ADR 0006, D-PO-10). Slot, nunca Stack/Tabs (ADR 0002).
export default function LayoutAdmin() {
  return (
    <AreaProtegida area="admin">
      <Slot />
    </AreaProtegida>
  );
}
