// Novidades da tela "Propostas da carga" (card 021, ADR 0010). Funções puras: comparam o retrato
// anterior da lista com o atual e devolvem o texto que a região viva anuncia ("1 nova proposta").
// Fica em lib (e não ao lado da rota) porque todo arquivo de `src/app` vira uma rota do expo-router.

export interface ComId {
  id: string;
}

/** Ids que estão em `atual` e não estavam em `anterior`, na ordem de `atual`. */
export function idsNovos(
  anterior: readonly ComId[] | undefined,
  atual: readonly ComId[] | undefined,
): string[] {
  if (!anterior || !atual) return [];
  const conhecidos = new Set(anterior.map((item) => item.id));
  return atual.filter((item) => !conhecidos.has(item.id)).map((item) => item.id);
}

/**
 * "1 nova proposta" / "3 novas propostas". Devolve `null` quando não chegou nenhuma (proposta que
 * só mudou de status não é novidade) ou quando falta um dos retratos.
 */
export function descreverNovidades(
  anterior: readonly ComId[] | undefined,
  atual: readonly ComId[] | undefined,
): string | null {
  const total = idsNovos(anterior, atual).length;
  if (total === 0) return null;
  return total === 1 ? '1 nova proposta' : `${total} novas propostas`;
}
