// Chave Pix do motorista: GET e PUT /motorista/chave-pix (card 047). Só as chamadas (sem TanStack
// Query); os hooks ficam em `chavePix.hooks.ts` (ADR 0004, adendo). A chave é dado pessoal: este
// módulo não registra nada em log nem guarda em armazenamento.
import { requisitar } from './cliente';
import type { CorpoChavePix, RespostaChavePix } from './tipos';

export function lerChavePix(): Promise<RespostaChavePix> {
  return requisitar<RespostaChavePix>('GET', '/motorista/chave-pix');
}

/** Cadastra ou troca. Manda só os dois campos do contrato; a API valida e devolve a chave normalizada. */
export function salvarChavePix(dados: CorpoChavePix): Promise<RespostaChavePix> {
  const corpo: CorpoChavePix = {
    tipo_chave_pix: dados.tipo_chave_pix,
    chave_pix: dados.chave_pix,
  };
  return requisitar<RespostaChavePix>('PUT', '/motorista/chave-pix', { corpo });
}
