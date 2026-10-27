// Limpezas da sessão (ADR 0004, adendo). A sessão vive no JS inicial e não conhece o TanStack
// Query: quem guarda dados da conta (o cliente de consultas, carregado só nas áreas logadas) se
// registra aqui, e `entrar` e `sair` rodam todas as limpezas registradas.
const limpezas = new Set<() => void>();

/** Registra uma limpeza (esvaziar o cache, por exemplo). Devolve a função que desfaz o registro. */
export function registrarLimpezaDaSessao(limpar: () => void): () => void {
  limpezas.add(limpar);
  return () => {
    limpezas.delete(limpar);
  };
}

/** Roda todas as limpezas registradas: nada da conta anterior pode aparecer na seguinte. */
export function executarLimpezasDaSessao(): void {
  limpezas.forEach((limpar) => limpar());
}
