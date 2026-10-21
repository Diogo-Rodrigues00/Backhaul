// Worker do MSW para o navegador. Só entra no bundle quando EXPO_PUBLIC_API_MOCK=msw
// (preview da Vercel): ver src/lib/mocks.web.ts. Usa os mesmos handlers dos testes.
import { setupWorker } from 'msw/browser';

import { criarHandlers } from './handlers';

export async function iniciarMocks(): Promise<void> {
  const base = process.env.EXPO_PUBLIC_API_URL ?? '';
  const worker = setupWorker(...criarHandlers(base));
  await worker.start({ onUnhandledRequest: 'bypass' });

  // Verificação visível no preview: aparece na aba Rede como interceptada. Sai quando alguma
  // tela chamar /saude pelo cliente de API (card 004).
  void fetch(`${base.replace(/\/+$/, '')}/saude`).catch(() => undefined);
}
