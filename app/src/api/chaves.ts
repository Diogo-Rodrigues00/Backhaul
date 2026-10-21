// Chaves de cache do TanStack Query (ADR 0004). Proibido chave literal fora deste arquivo.
import type { ParametrosCargasProximas } from './tipos';

export const chaves = {
  eu: () => ['eu'] as const,
  certificacoes: () => ['certificacoes'] as const,
  cargas: {
    minhas: () => ['cargas', 'minhas'] as const,
    /** Sem parâmetros: prefixo que casa com qualquer busca (usado para invalidar). */
    proximas: (parametros?: ParametrosCargasProximas) =>
      parametros === undefined
        ? (['cargas', 'proximas'] as const)
        : (['cargas', 'proximas', parametros] as const),
  },
  disponibilidades: {
    minhas: () => ['disponibilidades', 'minhas'] as const,
  },
  propostas: {
    minhas: () => ['propostas', 'minhas'] as const,
    daCarga: (cargaId: string) => ['propostas', 'daCarga', cargaId] as const,
  },
  fretes: {
    meus: () => ['fretes', 'meus'] as const,
  },
};
