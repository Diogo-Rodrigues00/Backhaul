import { criarProvedorAsaas } from "./asaas";
import { criarProvedorSimulado } from "./simulado";
import type { ProvedorPagamento } from "./tipos";

const URL_SANDBOX = "https://api-sandbox.asaas.com/v3";

// Escolhe o provedor pelo ambiente. O padrão é SIMULADO: esquecer a variável nunca
// faz o sistema falar com um gateway de verdade.
//   PAGAMENTOS_MODO=simulado  (padrão)
//   PAGAMENTOS_MODO=sandbox   exige ASAAS_API_KEY (chave do SANDBOX)
// Produção real exige uma decisão explícita (ASAAS_BASE_URL) e vem em outra etapa.
export function escolherProvedor(env: NodeJS.ProcessEnv = process.env): ProvedorPagamento {
  const modo = (env.PAGAMENTOS_MODO ?? "simulado").toLowerCase();
  if (modo === "simulado") return criarProvedorSimulado();
  if (modo === "sandbox") {
    const chaveApi = env.ASAAS_API_KEY;
    if (!chaveApi) throw new Error("PAGAMENTOS_MODO=sandbox exige ASAAS_API_KEY");
    return criarProvedorAsaas({ chaveApi, urlBase: env.ASAAS_BASE_URL ?? URL_SANDBOX });
  }
  throw new Error(`PAGAMENTOS_MODO inválido: "${modo}" (use simulado ou sandbox)`);
}
