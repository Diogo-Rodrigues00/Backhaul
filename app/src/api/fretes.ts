// Fretes: GET /fretes/meus (duas formas), PATCH /fretes/:id/status e POST /fretes/:id/pagamento.
// Só as chamadas (sem TanStack Query); os hooks ficam em `fretes.hooks.ts` (ADR 0004, adendo 2).
import { requisitar } from './cliente';
import type {
  CorpoStatusFrete,
  Frete,
  FreteDaEmpresa,
  FreteDoMotorista,
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

export function pagarFrete(freteId: string): Promise<RespostaPagamento> {
  return requisitar<RespostaPagamento>('POST', `/fretes/${encodeURIComponent(freteId)}/pagamento`);
}
