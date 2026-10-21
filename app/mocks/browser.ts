// Worker do MSW para o navegador. Só entra no bundle quando EXPO_PUBLIC_API_MOCK=msw
// (preview da Vercel): ver src/lib/mocks.web.ts. O card 004 troca as descrições de
// `criarHandlers` por handlers completos; esta ligação continua valendo.
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { criarHandlers } from './handlers';

export async function iniciarMocks(): Promise<void> {
  const base = process.env.EXPO_PUBLIC_API_URL ?? '';
  const handlers = criarHandlers(base).map((d) => {
    const resolver = () =>
      HttpResponse.json(d.corpo as Record<string, unknown>, { status: d.status });
    return d.metodo === 'GET'
      ? http.get(d.url, resolver)
      : d.metodo === 'POST'
        ? http.post(d.url, resolver)
        : http.patch(d.url, resolver);
  });

  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledRequest: 'bypass' });

  // Verificação visível no preview: aparece na aba Rede como interceptada. Sai quando o
  // cliente de API (card 004) fizer a primeira chamada real a /saude.
  void fetch(`${base}/saude`).catch(() => undefined);
}
