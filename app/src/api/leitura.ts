// Opções comuns das leituras (polling e habilitação). Fica separado de `consulta.ts` porque os hooks
// de `*.hooks.ts` o importam e `consulta.ts` importa o TanStack Query: este arquivo não pode puxá-lo
// (o TanStack só carrega nas áreas logadas, ADR 0004, adendo).

/** Intervalo da atualização automática das telas de espera (ADR 0010). */
export const INTERVALO_ATUALIZACAO_MS = 10_000;

export type OpcoesLeitura = {
  /** Liga a atualização a cada 10 s, só com a aba visível (ADR 0010). */
  automatico?: boolean;
  /** Falso mantém a consulta parada (sem sessão ou servidor ainda não pronto, ADR 0005). */
  habilitado?: boolean;
  /** Intervalo da atualização automática, no lugar dos 10 s (ex.: 5 s enquanto espera um Pix). */
  intervaloMs?: number;
};

/** Opções de polling e habilitação comuns aos hooks de leitura. */
export function opcoesDeLeitura({
  automatico = false,
  habilitado = true,
  intervaloMs = INTERVALO_ATUALIZACAO_MS,
}: OpcoesLeitura = {}) {
  return {
    enabled: habilitado,
    refetchInterval: automatico ? intervaloMs : (false as const),
  };
}
