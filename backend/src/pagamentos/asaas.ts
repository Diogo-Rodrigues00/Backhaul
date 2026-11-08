import type { TipoChavePix } from "../validacao";
import type {
  CobrancaPixCriada,
  EventoPagamento,
  PedidoCobrancaPix,
  PedidoRepassePix,
  ProvedorPagamento,
  RepasseSolicitado,
} from "./tipos";

// ---------- Funções puras (testáveis sem rede) ----------

// 350010 → 3500.1. O Asaas trabalha com reais em número; a divisão por 100 de um
// inteiro de centavos gera o double mais próximo, e o JSON sai "3500.1" sem lixo.
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

// Nossos tipos de chave (minúsculos, sem acento) → nomes que o Asaas espera.
const TIPO_CHAVE_ASAAS: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "EMAIL",
  telefone: "PHONE",
  aleatoria: "EVP",
};

export function tipoChaveAsaas(tipo: TipoChavePix): string {
  return TIPO_CHAVE_ASAAS[tipo];
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

// Traduz o corpo de um webhook do Asaas para um EventoPagamento nosso.
// Devolve null para eventos que não nos interessam (ex.: PAYMENT_CREATED): o webhook
// responde 200 mesmo assim, senão o Asaas ficaria reenviando o que a gente ignora.
//
// ATENÇÃO: o formato abaixo (id do evento no topo, "payment"/"transfer" aninhados)
// segue a documentação do Asaas, mas ainda não foi visto em tráfego real. Conferir no
// sandbox com um webhook de verdade antes de confiar.
export function interpretarEventoAsaas(corpo: unknown): EventoPagamento | null {
  const c = objeto(corpo);
  if (!c) return null;
  const evento = texto(c.event);
  const eventoId = texto(c.id);
  if (!evento || !eventoId) return null;

  if (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED") {
    const pagamento = objeto(c.payment);
    const cobrancaId = texto(pagamento?.id);
    if (!cobrancaId) return null;
    return { tipo: "cobranca_paga", eventoId, cobrancaId, referencia: texto(pagamento?.externalReference) };
  }

  if (evento === "TRANSFER_DONE") {
    const repasseId = texto(objeto(c.transfer)?.id);
    return repasseId ? { tipo: "repasse_concluido", eventoId, repasseId } : null;
  }

  if (evento === "TRANSFER_FAILED" || evento === "TRANSFER_CANCELLED") {
    const t = objeto(c.transfer);
    const repasseId = texto(t?.id);
    return repasseId ? { tipo: "repasse_falhou", eventoId, repasseId, motivo: texto(t?.failReason) } : null;
  }

  return null;
}

// ---------- Cliente HTTP ----------

export interface ConfigAsaas {
  chaveApi: string;
  urlBase: string;
}

// Erro com o status HTTP do gateway. A mensagem NUNCA inclui a chave de API.
export class ErroGateway extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

export function criarProvedorAsaas(config: ConfigAsaas): ProvedorPagamento {
  async function chamar(metodo: "GET" | "POST", caminho: string, corpo?: unknown): Promise<Record<string, unknown>> {
    const resposta = await fetch(config.urlBase + caminho, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "backhaul-api",
        access_token: config.chaveApi,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const json = objeto(await resposta.json().catch(() => null)) ?? {};
    if (!resposta.ok) {
      const erros = Array.isArray(json.errors) ? json.errors : [];
      const descricao = texto(objeto(erros[0])?.description) ?? "erro sem descrição";
      throw new ErroGateway(`Asaas ${metodo} ${caminho} falhou (${resposta.status}): ${descricao}`, resposta.status);
    }
    return json;
  }

  return {
    nome: "asaas",

    async criarCobrancaPix(pedido: PedidoCobrancaPix): Promise<CobrancaPixCriada> {
      // O Asaas exige um "cliente" (quem paga) antes da cobrança.
      // TODO: guardar o id do cliente na empresa para não criar um novo a cada frete.
      const cliente = await chamar("POST", "/customers", {
        name: pedido.pagador.nome,
        cpfCnpj: pedido.pagador.cpfCnpj,
      });
      const clienteId = texto(cliente.id);
      if (!clienteId) throw new ErroGateway("Asaas não devolveu o id do cliente", 502);

      const cobranca = await chamar("POST", "/payments", {
        customer: clienteId,
        billingType: "PIX",
        value: centavosParaReais(pedido.valorCentavos),
        dueDate: pedido.venceEm,
        description: pedido.descricao,
        externalReference: pedido.referencia,
      });
      const cobrancaId = texto(cobranca.id);
      if (!cobrancaId) throw new ErroGateway("Asaas não devolveu o id da cobrança", 502);

      const qr = await chamar("GET", `/payments/${cobrancaId}/pixQrCode`);
      return {
        cobrancaId,
        copiaECola: texto(qr.payload) ?? "",
        qrCodeBase64: texto(qr.encodedImage) ?? "",
        expiraEm: texto(qr.expirationDate),
      };
    },

    async solicitarRepassePix(pedido: PedidoRepassePix): Promise<RepasseSolicitado> {
      const t = await chamar("POST", "/transfers", {
        value: centavosParaReais(pedido.valorCentavos),
        pixAddressKey: pedido.chave,
        pixAddressKeyType: tipoChaveAsaas(pedido.tipoChave),
        description: pedido.descricao,
        externalReference: pedido.referencia,
      });
      const repasseId = texto(t.id);
      if (!repasseId) throw new ErroGateway("Asaas não devolveu o id da transferência", 502);
      // Nasce PENDING: só o webhook TRANSFER_DONE confirma que o dinheiro chegou.
      return { repasseId, status: "pendente" };
    },
  };
}
