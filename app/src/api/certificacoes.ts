// GET /certificacoes: lista fixa (MOPP/ONU) para preencher formulários.
import { useQuery } from '@tanstack/react-query';

import { requisitar } from './cliente';
import { chaves } from './chaves';
import { opcoesDeLeitura, type OpcoesLeitura } from './consulta';
import type { RespostaCertificacoes } from './tipos';

export function listarCertificacoes(): Promise<RespostaCertificacoes> {
  return requisitar<RespostaCertificacoes>('GET', '/certificacoes');
}

export function useCertificacoes(opcoes?: OpcoesLeitura) {
  return useQuery({
    queryKey: chaves.certificacoes(),
    queryFn: listarCertificacoes,
    // A lista quase não muda: não precisa ser buscada de novo a cada tela.
    staleTime: 10 * 60_000,
    ...opcoesDeLeitura(opcoes),
  });
}
