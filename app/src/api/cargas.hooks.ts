// Hooks de cargas (TanStack Query). As chamadas ficam em `cargas.ts`.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listarCargasProximas, listarMinhasCargas, publicarCarga } from './cargas';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type { ParametrosCargasProximas } from './tipos';

/** Invalida: cargas.minhas. */
export function usePublicarCarga() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: publicarCarga,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.cargas.minhas() }),
  });
}

export function useMinhasCargas(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.cargas.minhas(),
    queryFn: listarMinhasCargas,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Sem `parametros` (ainda sem GPS/disponibilidade ativa) a consulta fica parada. */
export function useCargasProximas(
  parametros: ParametrosCargasProximas | null,
  opcoes?: OpcoesLeitura,
) {
  const leitura = opcoesDeLeitura(opcoes);
  return useQuery({
    queryKey: chaves.cargas.proximas(parametros ?? undefined),
    queryFn: () => {
      if (parametros === null) {
        throw new Error('useCargasProximas: parâmetros ausentes');
      }
      return listarCargasProximas(parametros);
    },
    ...leitura,
    enabled: leitura.enabled && parametros !== null,
  });
}
