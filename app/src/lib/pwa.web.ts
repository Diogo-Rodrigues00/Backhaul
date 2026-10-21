// Registro do service worker (ADR 0014). Só web; o nativo usa pwa.native.ts (vazio).
// Os `process.env.*` são literais de propósito: o Expo só os troca por valor no build assim.

/**
 * Registra /sw.js depois do evento `load` (não compete com o carregamento inicial).
 * Não registra fora de produção nem no modo mock: no preview o service worker do MSW
 * ocupa o escopo da origem.
 */
export function registrarServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.EXPO_PUBLIC_API_MOCK) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registrar = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  };

  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}
