// Fretes: GET /fretes/meus (duas formas), PATCH /fretes/:id/status e POST /fretes/:id/pagamento.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
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

export function useMeusFretes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.fretes.meus(),
    queryFn: listarMeusFretes,
    ...opcoesDeLeitura(opcoes),
  });
}

/** Invalida: fretes.meus. */
export function useAtualizarStatusFrete() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({
      freteId,
      status,
    }: {
      freteId: string;
      status: CorpoStatusFrete['status_entrega'];
    }) => atualizarStatusFrete(freteId, status),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.fretes.meus() }),
  });
}

/** Invalida: fretes.meus. */
export function usePagarFrete() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: pagarFrete,
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.fretes.meus() }),
  });
}
