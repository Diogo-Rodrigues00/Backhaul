// Certificações: GET /certificacoes (catálogo, todo usuário logado), GET e POST /certificacoes/minhas
// (motorista) e GET /certificacoes/pendentes + POST /certificacoes/pendentes/:id/responder (admin).
// Só as chamadas (sem TanStack Query); os hooks ficam em `certificacoes.hooks.ts` (ADR 0004, adendo).
import { ErroApi } from '@/lib/erros';

import { requisitar } from './cliente';
import type {
  AcaoCertificacao,
  CertificacaoPendente,
  CertificacaoPendenteDoContrato,
  CorpoEnviarCertificacao,
  RespostaCertificacoes,
  RespostaCertificacoesPendentes,
  RespostaEnviarCertificacao,
  RespostaMinhasCertificacoes,
  RespostaResponderCertificacao,
} from './tipos';

export function listarCertificacoes(): Promise<RespostaCertificacoes> {
  return requisitar<RespostaCertificacoes>('GET', '/certificacoes');
}

export function listarMinhasCertificacoes(): Promise<RespostaMinhasCertificacoes> {
  return requisitar<RespostaMinhasCertificacoes>('GET', '/certificacoes/minhas');
}

/**
 * Cadastra ou reenvia (o backend responde 201 nos dois casos). Manda só os três campos do contrato,
 * para que nada a mais do formulário chegue à API.
 */
export function enviarCertificacao(
  dados: CorpoEnviarCertificacao,
): Promise<RespostaEnviarCertificacao> {
  const corpo: CorpoEnviarCertificacao = {
    certificacao_id: dados.certificacao_id,
    numero_certificado: dados.numero_certificado,
    validade: dados.validade,
  };
  return requisitar<RespostaEnviarCertificacao>('POST', '/certificacoes/minhas', { corpo });
}

/**
 * Só os campos que a fila do admin pode mostrar. cpf e cnh do motorista ficam de fora: o contrato os
 * devolve, mas o app não exibe nem guarda (card 032). O mapeamento é campo a campo, então um campo
 * novo que a API mande no futuro também não chega às telas.
 */
export function paraCertificacaoPendente(
  bruta: CertificacaoPendenteDoContrato,
): CertificacaoPendente {
  return {
    id: bruta.id,
    certificacao: bruta.certificacao,
    numero_certificado: bruta.numero_certificado,
    validade: bruta.validade,
    criado_em: bruta.criado_em,
    motorista: {
      id: bruta.motorista.id,
      nome_completo: bruta.motorista.nome_completo,
      veiculo_placa: bruta.motorista.veiculo_placa,
    },
  };
}

/** GET /certificacoes/pendentes (admin). A resposta crua não sai daqui: quem chama recebe a versão filtrada. */
export async function listarCertificacoesPendentes(): Promise<RespostaCertificacoesPendentes> {
  const resposta = await requisitar<{ certificacoes?: CertificacaoPendenteDoContrato[] }>(
    'GET',
    '/certificacoes/pendentes',
  );
  if (!Array.isArray(resposta.certificacoes)) {
    throw ErroApi.falha();
  }
  return { certificacoes: resposta.certificacoes.map(paraCertificacaoPendente) };
}

export function responderCertificacaoPendente(
  certificacaoId: string,
  acao: AcaoCertificacao,
): Promise<RespostaResponderCertificacao> {
  return requisitar<RespostaResponderCertificacao>(
    'POST',
    `/certificacoes/pendentes/${encodeURIComponent(certificacaoId)}/responder`,
    { corpo: { acao } },
  );
}
