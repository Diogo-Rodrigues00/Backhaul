// Ligação do "foco" do TanStack Query com a plataforma (ADR 0004). Esta é a versão que o
// TypeScript enxerga; o Metro escolhe foco.web.ts na web e foco.native.ts no iPhone.

/** Sem efeito nesta plataforma. */
export function configurarFoco(): void {
  // vazio de propósito
}
