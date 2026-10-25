// GET /certificacoes: lista fixa (MOPP/ONU) para preencher formulários. Só a chamada (sem TanStack
// Query); o hook fica em `certificacoes.hooks.ts` (ADR 0004, adendo).
import { requisitar } from './cliente';
import type { RespostaCertificacoes } from './tipos';

export function listarCertificacoes(): Promise<RespostaCertificacoes> {
  return requisitar<RespostaCertificacoes>('GET', '/certificacoes');
}
