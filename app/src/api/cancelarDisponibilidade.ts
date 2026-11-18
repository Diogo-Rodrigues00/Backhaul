// POST /disponibilidades/:id/cancelar (docs/api.md, só o motorista dono). Sem corpo. Em arquivo próprio,
// como `publicarDisponibilidade.ts`: a leitura (GET) vive no provider da área do motorista e este POST
// é usado pelo corpo da tela carregado sob demanda; no mesmo módulo, o Metro o moveria para o chunk comum.
// Só a chamada (sem TanStack Query); o hook fica em `cancelarDisponibilidade.hooks.ts`.
import { requisitar } from './cliente';
import type { RespostaCancelarDisponibilidade } from './tipos';

export function cancelarDisponibilidade(id: string): Promise<RespostaCancelarDisponibilidade> {
  return requisitar<RespostaCancelarDisponibilidade>(
    'POST',
    `/disponibilidades/${encodeURIComponent(id)}/cancelar`,
  );
}
