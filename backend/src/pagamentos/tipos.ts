import type { TipoChavePix } from "../validacao";

// Contrato entre o NOSSO sistema e qualquer gateway de pagamento.
// As rotas só conhecem estes tipos; o Asaas (ou outro) fica atrás da interface.
// Assim dá para trocar de gateway, ou usar o modo simulado, sem mexer nas rotas.
//
// Dinheiro SEMPRE em centavos inteiros aqui dentro. A conversão para reais (o que o
// Asaas espera) acontece só na borda, dentro de asaas.ts.

export interface PedidoCobrancaPix {
  referencia: string; // id do frete: volta nos webhooks e liga o evento ao nosso registro
  valorCentavos: number;
  descricao: string;
  pagador: { nome: string; cpfCnpj: string }; // empresa que paga
  venceEm: string; // AAAA-MM-DD
}

export interface CobrancaPixCriada {
  cobrancaId: string; // id no gateway (vai para transacoes.gateway_referencia)
  copiaECola: string; // código Pix que a empresa cola no app do banco
  qrCodeBase64: string; // imagem do QR Code
  expiraEm: string | null;
}

export interface PedidoRepassePix {
  referencia: string; // id do frete
  valorCentavos: number;
  chave: string;
  tipoChave: TipoChavePix;
  descricao: string;
}

export interface RepasseSolicitado {
  repasseId: string; // vai para transacoes.repasse_referencia
  status: "pendente" | "concluido" | "falhou";
}

export interface ProvedorPagamento {
  readonly nome: "simulado" | "asaas";
  criarCobrancaPix(pedido: PedidoCobrancaPix): Promise<CobrancaPixCriada>;
  solicitarRepassePix(pedido: PedidoRepassePix): Promise<RepasseSolicitado>;
}

// O que um webhook significa para o NOSSO domínio, já separado do vocabulário do gateway.
export type EventoPagamento =
  | { tipo: "cobranca_paga"; eventoId: string; cobrancaId: string; referencia: string | null }
  | { tipo: "repasse_concluido"; eventoId: string; repasseId: string }
  | { tipo: "repasse_falhou"; eventoId: string; repasseId: string; motivo: string | null };
