// Disponibilidades do motorista: GET /disponibilidades/minhas (o POST está em publicarDisponibilidade.ts).
// Só a chamada (sem TanStack Query); o hook fica em `disponibilidades.hooks.ts` (ADR 0004, adendo 2).
// PROPOSTA relatório 4b: GET /disponibilidades/minhas ainda não existe no backend; o formato
// está em tipos.ts. Quando entrar em docs/api.md, conferir.
import { requisitar } from './cliente';
import type { RespostaMinhasDisponibilidades } from './tipos';

export function listarMinhasDisponibilidades(): Promise<RespostaMinhasDisponibilidades> {
  return requisitar<RespostaMinhasDisponibilidades>('GET', '/disponibilidades/minhas');
}
