// PATCH /admin/usuarios/:id/ativo (docs/api.md, só o admin). Corpo: { ativo: boolean }. Em arquivo próprio,
// como `cancelarDisponibilidade.ts`: é usado só pelo corpo da tela, carregado sob demanda.
// Só a chamada (sem TanStack Query); o hook fica em `alterarUsuarioAdmin.hooks.ts`.
import { requisitar } from './cliente';
import type { RespostaAlterarUsuarioAdmin } from './tipos';

export function alterarAtivoUsuarioAdmin(
  id: string,
  ativo: boolean,
): Promise<RespostaAlterarUsuarioAdmin> {
  return requisitar<RespostaAlterarUsuarioAdmin>(
    'PATCH',
    `/admin/usuarios/${encodeURIComponent(id)}/ativo`,
    { corpo: { ativo } },
  );
}
