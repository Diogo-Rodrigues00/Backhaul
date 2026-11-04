// Hooks do admin (TanStack Query, só leitura). As chamadas ficam em `admin.ts`.
// Sem atualização automática: o resumo e as listas são consultados ao abrir a tela (ADR 0010).
import { useQuery } from './tanstack';

import { obterResumoAdmin, listarFretesAdmin, listarUsuariosAdmin } from './admin';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './leitura';

export function useResumoAdmin(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.admin.resumo(),
    queryFn: obterResumoAdmin,
    ...opcoesDeLeitura(opcoes),
  });
}

export function useFretesAdmin(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.admin.fretes(),
    queryFn: listarFretesAdmin,
    ...opcoesDeLeitura(opcoes),
  });
}

export function useUsuariosAdmin(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.admin.usuarios(),
    queryFn: listarUsuariosAdmin,
    ...opcoesDeLeitura(opcoes),
  });
}
