// iPhone: não existe `visibilitychange`; o foco do app vem do AppState (ADR 0004).
// App em segundo plano = sem foco = o intervalo de atualização automática para.
import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

export function configurarFoco(): void {
  focusManager.setEventListener((definirFoco) => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      definirFoco(estado === 'active');
    });
    return () => assinatura.remove();
  });
}
