// Cargas: POST /cargas, GET /cargas/minhas (empresa) e GET /cargas/proximas (motorista).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requisitar, montarConsulta } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type {
  CorpoPublicarCarga,
  ParametrosCargasProximas,
  RespostaCargasProximas,
  RespostaMinhasCargas,
  RespostaPublicarCarga,
} from './tipos';

export function publicarCarga(dados: CorpoPublicarCarga): Promise<RespostaPublicarCarga> {
  return requisitar<RespostaPublicarCarga>('POST', '/cargas', { corpo: dados });
}

export function listarMinhasCargas(): Promise<RespostaMinhasCargas> {
  return requisitar<RespostaMinhasCargas>('GET', '/cargas/minhas');
}

export function listarCargasProximas(
  parametros: ParametrosCargasProximas,
): Promise<RespostaCargasProximas> {
  return requisitar<RespostaCargasProximas>(
    'GET',
    `/cargas/proximas${montarConsulta({ ...parametros })}`,
  );
}

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
