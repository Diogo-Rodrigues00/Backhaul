// Cargas: POST /cargas, GET /cargas/minhas (empresa) e GET /cargas/proximas (motorista).
// Só as chamadas (sem TanStack Query); os hooks ficam em `cargas.hooks.ts` (ADR 0004, adendo).
import { requisitar, montarConsulta } from './cliente';
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
