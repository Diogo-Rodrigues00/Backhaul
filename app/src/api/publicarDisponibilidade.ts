// POST /disponibilidades (publicar). Em arquivo próprio, fora de `disponibilidades.ts`, porque a
// leitura (GET /disponibilidades/minhas) vive no layout do motorista e a publicação, no formulário
// carregado sob demanda: no mesmo módulo, o Metro o moveria para o chunk comum (JS inicial, ADR 0011).
// Só a chamada (sem TanStack Query); o hook fica em `publicarDisponibilidade.hooks.ts`.
import { requisitar } from './cliente';
import type { CorpoPublicarDisponibilidade, RespostaPublicarDisponibilidade } from './tipos';

export function publicarDisponibilidade(
  dados: CorpoPublicarDisponibilidade,
): Promise<RespostaPublicarDisponibilidade> {
  return requisitar<RespostaPublicarDisponibilidade>('POST', '/disponibilidades', {
    corpo: dados,
  });
}
