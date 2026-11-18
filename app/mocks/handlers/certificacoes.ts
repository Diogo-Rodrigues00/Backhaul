// Certificações: catálogo (GET /certificacoes, qualquer logado), do motorista (GET e POST /certificacoes/minhas)
// e a fila do admin (GET /certificacoes/pendentes e POST /certificacoes/pendentes/:id/responder).
// As mensagens e a ordem das checagens são as de backend/src/validacao.ts e backend/src/rotas/certificacoes.ts.
import { http, HttpResponse } from 'msw';

import {
  certificacoesMock,
  certificacoesPendentesContratoMock,
  MINHA_CERT_ENVIADA_ID,
  minhasCertificacoesMock,
} from '../fixtures/certificacoes';
import { respostaErro, respostaErros } from '../respostas';
import { autenticar, eUuid, lerCorpo, textoDoParametro, textoOuVazio } from './comum';

const MAXIMO_NUMERO_CERTIFICADO = 60;
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Data AAAA-MM-DD que existe no calendário ("2026-02-31" tem o formato, mas não existe). */
function eDataDeCalendario(valor: string): boolean {
  const data = new Date(`${valor}T00:00:00.000Z`);
  return (
    REGEX_DATA.test(valor) &&
    !Number.isNaN(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

/** Espelho de validarEnvioCertificacao (backend). Devolve as mensagens; lista vazia = válido. */
export function validarEnvioCertificacaoMock(corpo: Record<string, unknown>): string[] {
  const erros: string[] = [];
  if (!eUuid(textoOuVazio(corpo.certificacao_id))) {
    erros.push('certificacao_id deve ser um UUID válido');
  }
  const numero = textoOuVazio(corpo.numero_certificado);
  if (numero === '') erros.push('numero_certificado é obrigatório');
  const validade = textoOuVazio(corpo.validade);
  if (!eDataDeCalendario(validade)) {
    erros.push('validade deve ser uma data válida no formato AAAA-MM-DD');
  }
  if (numero.length > MAXIMO_NUMERO_CERTIFICADO) {
    erros.push('numero_certificado deve ter no máximo 60 caracteres');
  }
  // Só compara a data quando o resto está certo, como o backend (que só então sabe a data).
  if (erros.length === 0 && validade < new Date().toISOString().slice(0, 10)) {
    erros.push('validade não pode estar no passado');
  }
  return erros;
}

export function criarHandlersCertificacoes(baseUrl: string) {
  return [
    http.get(`${baseUrl}/certificacoes`, ({ request }) => {
      const { resposta } = autenticar(request);
      return resposta ?? HttpResponse.json({ certificacoes: certificacoesMock });
    }),

    http.get(`${baseUrl}/certificacoes/minhas`, ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      return resposta ?? HttpResponse.json({ certificacoes: minhasCertificacoesMock });
    }),

    // Sem estado: o envio não fica gravado. A regra de 409 usa a lista fixa (a certificação de MOPP 3
    // do motorista de exemplo já está aprovada e vigente).
    http.post(`${baseUrl}/certificacoes/minhas`, async ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros = validarEnvioCertificacaoMock(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      const certificacaoId = textoOuVazio(corpo.certificacao_id);
      if (!certificacoesMock.some((c) => c.id === certificacaoId)) {
        return respostaErros(400, ['certificacao_id não corresponde a nenhuma certificação']);
      }
      const jaAprovada = minhasCertificacoesMock.some(
        (c) => c.certificacao_id === certificacaoId && c.situacao === 'aprovada',
      );
      if (jaAprovada) {
        return respostaErro(409, 'certificação já aprovada e dentro da validade');
      }
      return HttpResponse.json(
        {
          certificacao: {
            id: MINHA_CERT_ENVIADA_ID,
            certificacao_id: certificacaoId,
            numero_certificado: textoOuVazio(corpo.numero_certificado),
            validade: textoOuVazio(corpo.validade),
            validado_por_admin: false,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    // Responde com cpf e cnh, como o backend. Quem não pode mostrá-los é o app (fetcher de certificacoes.ts).
    http.get(`${baseUrl}/certificacoes/pendentes`, ({ request }) => {
      const { resposta } = autenticar(request, ['admin']);
      return resposta ?? HttpResponse.json({ certificacoes: certificacoesPendentesContratoMock });
    }),

    http.post(`${baseUrl}/certificacoes/pendentes/:id/responder`, async ({ request, params }) => {
      const { resposta } = autenticar(request, ['admin']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const id = textoDoParametro(params.id);
      const erros: string[] = [];
      if (!eUuid(id)) erros.push('id deve ser um UUID válido');
      if (corpo.acao !== 'aprovar' && corpo.acao !== 'recusar') {
        erros.push('acao deve ser aprovar ou recusar');
      }
      if (erros.length > 0) return respostaErros(400, erros);
      if (!certificacoesPendentesContratoMock.some((c) => c.id === id)) {
        return respostaErro(404, 'certificação pendente não encontrada');
      }
      if (corpo.acao === 'recusar') {
        return HttpResponse.json({ certificacao: { id, recusada: true } });
      }
      return HttpResponse.json({ certificacao: { id, validado_por_admin: true } });
    }),
  ];
}
