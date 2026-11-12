// Chaves de cache do TanStack Query (ADR 0004). Proibido chave literal fora deste arquivo.
import type { ParametrosCargasProximas } from './tipos';

export const chaves = {
  eu: () => ['eu'] as const,
  certificacoes: {
    /**
     * Catálogo (GET /certificacoes). Nenhuma das três chaves é prefixo de outra: invalidar uma
     * não invalida as demais (o TanStack casa por prefixo).
     */
    catalogo: () => ['certificacoes', 'catalogo'] as const,
    minhas: () => ['certificacoes', 'minhas'] as const,
    pendentes: () => ['certificacoes', 'pendentes'] as const,
  },
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
  mensagens: {
    daProposta: (propostaId: string) => ['mensagens', 'daProposta', propostaId] as const,
  },
  fretes: {
    meus: () => ['fretes', 'meus'] as const,
  },
  motorista: {
    chavePix: () => ['motorista', 'chavePix'] as const,
  },
  admin: {
    resumo: () => ['admin', 'resumo'] as const,
    fretes: () => ['admin', 'fretes'] as const,
    usuarios: () => ['admin', 'usuarios'] as const,
  },
};
