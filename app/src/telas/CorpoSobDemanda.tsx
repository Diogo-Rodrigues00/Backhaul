import { Suspense, type ReactNode } from 'react';

import { useMontado } from '@/hooks/useMontado';

/**
 * Corpo de tela que abre por `React.lazy` depois da hidratação (ADR 0011): enquanto o código chega
 * (e no HTML estático) aparece `carregando`, com a mesma altura da lista, sem empurrar a tela.
 */
export function CorpoSobDemanda({
  carregando,
  children,
}: {
  carregando: ReactNode;
  children: ReactNode;
}) {
  const montado = useMontado();
  return montado ? <Suspense fallback={carregando}>{children}</Suspense> : carregando;
}
