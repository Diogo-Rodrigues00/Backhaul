import { randomUUID } from "node:crypto";
import type { CobrancaPixCriada, ProvedorPagamento, RepasseSolicitado } from "./tipos";

// Modo padrão (PAGAMENTOS_MODO=simulado): não fala com ninguém. Existe para a demo e
// os testes continuarem funcionando sem internet nem chave. Os ids ganham prefixo
// "sim_" para nunca serem confundidos com ids reais do gateway.
export function criarProvedorSimulado(): ProvedorPagamento {
  return {
    nome: "simulado",

    async criarCobrancaPix(): Promise<CobrancaPixCriada> {
      return { cobrancaId: `sim_${randomUUID()}`, copiaECola: "", qrCodeBase64: "", expiraEm: null };
    },

    async consultarCobrancaPix(cobrancaId: string): Promise<CobrancaPixCriada> {
      return { cobrancaId, copiaECola: "", qrCodeBase64: "", expiraEm: null };
    },

    async solicitarRepassePix(): Promise<RepasseSolicitado> {
      // No simulado o dinheiro "chega" na hora: não há webhook para esperar.
      return { repasseId: `sim_${randomUUID()}`, status: "concluido" };
    },
  };
}
