import { Slot } from 'expo-router';

import { AreaProtegida } from '@/components/organisms/AreaProtegida';
import { DisponibilidadeAtivaProvider } from '@/state/disponibilidade-ativa/DisponibilidadeAtivaProvider';

// Guarda da área do motorista (ADR 0006). Slot, nunca Stack/Tabs (ADR 0002). O provider da
// disponibilidade ativa fica aqui dentro: só consulta a API com o motorista autenticado.
export default function LayoutMotorista() {
  return (
    <AreaProtegida area="motorista">
      <DisponibilidadeAtivaProvider>
        <Slot />
      </DisponibilidadeAtivaProvider>
    </AreaProtegida>
  );
}
