// Admin (só leitura, só o tipo admin): GET /admin/resumo, /admin/fretes e /admin/usuarios. Só as chamadas
// (sem TanStack Query); os hooks ficam em `admin.hooks.ts` (ADR 0004, adendo).
import { requisitar } from './cliente';
import type { RespostaFretesAdmin, RespostaResumoAdmin, RespostaUsuariosAdmin } from './tipos';

export function obterResumoAdmin(): Promise<RespostaResumoAdmin> {
  return requisitar<RespostaResumoAdmin>('GET', '/admin/resumo');
}

/** Até 100 fretes, mais recentes primeiro. */
export function listarFretesAdmin(): Promise<RespostaFretesAdmin> {
  return requisitar<RespostaFretesAdmin>('GET', '/admin/fretes');
}

/** Até 200 usuários, mais recentes primeiro. A API nunca manda senha, CPF ou CNPJ. */
export function listarUsuariosAdmin(): Promise<RespostaUsuariosAdmin> {
  return requisitar<RespostaUsuariosAdmin>('GET', '/admin/usuarios');
}
