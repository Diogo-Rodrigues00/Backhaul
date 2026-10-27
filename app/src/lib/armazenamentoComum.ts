// Parte comum do armazenamento (ADR 0006). Fica fora de `armazenamento.ts` porque os arquivos
// `.web.ts` e `.native.ts` não podem importar o arquivo base (o Metro resolveria para eles mesmos).

// Chaves fixas. Mudar um nome aqui desloga quem já tem token gravado.
export const CHAVES = {
  token: 'backhaul.token',
  tema: 'backhaul.tema',
  disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
  propostasEnviadas: 'backhaul.propostasEnviadas',
} as const;

export type Chave = (typeof CHAVES)[keyof typeof CHAVES];

// Reserva para quando o depósito real falha (modo privado, dados do site bloqueados, erro do Keychain).
// Vale só enquanto o app estiver aberto.
export const memoriaReserva = new Map<string, string>();
