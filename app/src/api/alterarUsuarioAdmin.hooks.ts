// Hook de bloquear/reativar usuário (TanStack Query). A chamada fica em `alterarUsuarioAdmin.ts`.
import { useMutation, useQueryClient } from './tanstack';

import { alterarAtivoUsuarioAdmin } from './alterarUsuarioAdmin';
import { chaves } from './chaves';

/**
 * Invalida admin.usuarios (a situação muda) e admin.resumo (cargas abertas e propostas pendentes mudam
 * quando a conta é bloqueada). A mutation só termina depois das releituras; um erro na releitura não
 * falha a alteração, porque a invalidação não lança.
 */
export function useAlterarUsuarioAdmin() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => alterarAtivoUsuarioAdmin(id, ativo),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: chaves.admin.usuarios() }),
        cliente.invalidateQueries({ queryKey: chaves.admin.resumo() }),
      ]),
  });
}
