// Disponibilidades do motorista: GET /disponibilidades/minhas (o POST está em publicarDisponibilidade.ts).
// Só a chamada (sem TanStack Query); o hook fica em `disponibilidades.hooks.ts` (ADR 0004, adendo).
// GET /disponibilidades/minhas está em docs/api.md (card 050); o formato está em tipos.ts. Se a rota
// responder 404 (backend antigo) ou falhar, o app usa a cópia guardada no aparelho (plano B).
import { requisitar } from './cliente';
import type { RespostaMinhasDisponibilidades } from './tipos';

export function listarMinhasDisponibilidades(): Promise<RespostaMinhasDisponibilidades> {
  return requisitar<RespostaMinhasDisponibilidades>('GET', '/disponibilidades/minhas');
}
