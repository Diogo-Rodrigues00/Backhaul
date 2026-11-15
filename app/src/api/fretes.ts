// Fretes: GET /fretes/meus (duas formas), PATCH /fretes/:id/status e POST /fretes/:id/pagamento.
// Só as chamadas (sem TanStack Query); os hooks ficam em `fretes.hooks.ts` (ADR 0004, adendo).
import { requisitar } from './cliente';
import type {
  CorpoStatusFrete,
  Frete,
  FreteDaEmpresa,
  FreteDoMotorista,
  PixPagamento,
  RespostaMeusFretes,
  RespostaPagamento,
  RespostaStatusFrete,
} from './tipos';

/** O frete do motorista traz `empresa`; o da empresa traz `motorista`. */
export function eFreteDoMotorista(frete: Frete): frete is FreteDoMotorista {
  return 'empresa' in frete;
}

export function eFreteDaEmpresa(frete: Frete): frete is FreteDaEmpresa {
  return 'motorista' in frete;
}

/**
 * Frete do motorista só com os campos que a tela usa. Comissão e Pix (`comissao`, `pix_*`) não passam
 * daqui, mesmo que a API os mandasse: o motorista nunca vê a comissão (card 044).
 */
export function paraFreteDoMotorista(frete: FreteDoMotorista): FreteDoMotorista {
  return {
    id: frete.id,
    proposta_id: frete.proposta_id,
    tipo_carga: frete.tipo_carga,
    valor_final: frete.valor_final,
    status_entrega: frete.status_entrega,
    origem: frete.origem,
    destino: frete.destino,
    coleta_em: frete.coleta_em,
    entrega_em: frete.entrega_em,
    criado_em: frete.criado_em,
    status_pagamento: frete.status_pagamento,
    empresa: { id: frete.empresa.id, razao_social: frete.empresa.razao_social },
  };
}

export function listarMeusFretes(): Promise<RespostaMeusFretes> {
  return requisitar<RespostaMeusFretes>('GET', '/fretes/meus');
}

export function atualizarStatusFrete(
  freteId: string,
  status: CorpoStatusFrete['status_entrega'],
): Promise<RespostaStatusFrete> {
  const corpo: CorpoStatusFrete = { status_entrega: status };
  return requisitar<RespostaStatusFrete>('PATCH', `/fretes/${encodeURIComponent(freteId)}/status`, {
    corpo,
  });
}

// Limites generosos: o copia e cola do Pix tem centenas de caracteres e o PNG do QR, poucos KB.
const MAX_COPIA_E_COLA = 4_000;
const MAX_QR_BASE64 = 200_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Lê o `pix` da resposta sem confiar nele: só vale com os três campos no formato esperado (texto
 * não vazio, base64 e data válida); qualquer falha devolve `undefined` e a tela segue
 * como no modo simulado. Campos desconhecidos são descartados (a resposta pode ganhar campos).
 */
export function lerPix(bruto: unknown): PixPagamento | undefined {
  if (typeof bruto !== 'object' || bruto === null) return undefined;
  const {
    copia_e_cola: codigo,
    qr_code_base64: qr,
    expira_em: expira,
  } = bruto as Record<string, unknown>;
  if (typeof codigo !== 'string' || codigo.length === 0 || codigo.length > MAX_COPIA_E_COLA) {
    return undefined;
  }
  if (typeof qr !== 'string' || qr.length > MAX_QR_BASE64) return undefined;
  const qrLimpo = qr.replace(/\s/g, '');
  if (!BASE64.test(qrLimpo)) return undefined;
  if (typeof expira !== 'string' || Number.isNaN(Date.parse(expira))) return undefined;
  return { copia_e_cola: codigo, qr_code_base64: qrLimpo, expira_em: expira };
}

/**
 * Pix que a lista de fretes traz enquanto o pagamento está `pendente` (card 044): copia e cola e
 * validade. A lista não traz o QR Code (só o POST traz). Mesmas regras de `lerPix` para os dois campos.
 */
export function lerPixDaLista(
  frete: Pick<FreteDaEmpresa, 'pix_copia_cola' | 'pix_expira_em'>,
): { copia_e_cola: string; expira_em: string } | undefined {
  const codigo: unknown = frete.pix_copia_cola;
  const expira: unknown = frete.pix_expira_em;
  if (typeof codigo !== 'string' || codigo.length === 0 || codigo.length > MAX_COPIA_E_COLA) {
    return undefined;
  }
  if (typeof expira !== 'string' || Number.isNaN(Date.parse(expira))) return undefined;
  return { copia_e_cola: codigo, expira_em: expira };
}

export async function pagarFrete(freteId: string): Promise<RespostaPagamento> {
  const resposta = await requisitar<RespostaPagamento>(
    'POST',
    `/fretes/${encodeURIComponent(freteId)}/pagamento`,
  );
  const pix = lerPix((resposta as { pix?: unknown }).pix);
  return pix ? { transacao: resposta.transacao, pix } : { transacao: resposta.transacao };
}
