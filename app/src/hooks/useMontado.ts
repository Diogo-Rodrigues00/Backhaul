import { useSyncExternalStore } from 'react';

const semAssinatura = () => () => undefined;

/**
 * `false` no HTML estático e na hidratação, `true` depois. Serve a tudo que abre por `React.lazy`:
 * o servidor não renderiza o `lazy` (o React acusaria o erro 419 de Suspense) e o primeiro render
 * do cliente precisa ser igual ao HTML.
 */
export function useMontado(): boolean {
  return useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
}
