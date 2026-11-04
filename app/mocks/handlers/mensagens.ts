// Chat da proposta: GET e POST /propostas/:id/mensagens (sem estado; o mock com estado está em comEstado.ts).
// O filtro de contato é ESPELHO de backend/src/validacao.ts (validarMensagem e contemContato), com as
// mesmas expressões e as mesmas mensagens. Se o backend mudar a regra, muda aqui também:
// mocks/handlers/mensagens.test.ts documenta cada caso.
import { http, HttpResponse } from 'msw';

import { mensagensPorPropostaMock, PARTICIPANTES_PROPOSTA_MOCK } from '../fixtures/mensagens';
import { respostaErro, respostaErros } from '../respostas';
import { autenticar, eUuid, lerCorpo, textoDoParametro } from './comum';

export const MENSAGEM_MAXIMA_CARACTERES = 1000;

// E-mail: algo@algo.algo, ou a palavra "arroba" por extenso.
const REGEX_EMAIL_CHAT = /[^\s@]+@[^\s@]+\.[^\s@]+|\barroba\b/i;
// Telefone: 10 ou mais dígitos, com espaço, ponto, hífen ou parênteses entre eles.
const REGEX_TELEFONE_CHAT = /(?:\d[\s.\-()]*){10,}/;
// Link: http(s)://, www. ou domínio terminando em .com/.br/.me/.ly.
const REGEX_LINK_CHAT = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|br|me|ly)\b/i;

/** true se o texto parece trazer telefone, e-mail ou link (contemContato no backend). */
export function contemContato(texto: string): boolean {
  return (
    REGEX_EMAIL_CHAT.test(texto) || REGEX_TELEFONE_CHAT.test(texto) || REGEX_LINK_CHAT.test(texto)
  );
}

export type ResultadoTextoMensagem = { ok: true; texto: string } | { ok: false; erros: string[] };

/**
 * Espelho de validarMensagem (backend): o texto vem sem espaços nas pontas; a ordem das checagens é
 * obrigatório → tamanho → contato, e para no primeiro erro.
 */
export function validarTextoMensagem(valor: unknown): ResultadoTextoMensagem {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto === '') return { ok: false, erros: ['texto é obrigatório'] };
  if (texto.length > MENSAGEM_MAXIMA_CARACTERES) {
    return {
      ok: false,
      erros: [`texto deve ter no máximo ${MENSAGEM_MAXIMA_CARACTERES} caracteres`],
    };
  }
  if (contemContato(texto)) {
    return { ok: false, erros: ['mensagem não pode conter telefone, e-mail ou link'] };
  }
  return { ok: true, texto };
}

function participa(propostaId: string, usuarioId: string): boolean {
  const participantes = PARTICIPANTES_PROPOSTA_MOCK[propostaId];
  return (
    participantes !== undefined &&
    (participantes.empresa === usuarioId || participantes.motorista === usuarioId)
  );
}

export function criarHandlersMensagens(baseUrl: string) {
  return [
    http.get(`${baseUrl}/propostas/:id/mensagens`, ({ request, params }) => {
      const { usuario, resposta } = autenticar(request);
      if (resposta) return resposta;
      const id = textoDoParametro(params.id);
      if (!eUuid(id)) return respostaErros(400, ['id deve ser um UUID válido']);
      // Quem não participa (inclusive o admin) recebe o mesmo 404 de "não existe".
      if (!participa(id, usuario.usuario.id)) return respostaErro(404, 'proposta não encontrada');
      return HttpResponse.json({ mensagens: mensagensPorPropostaMock[id] ?? [] });
    }),

    http.post(`${baseUrl}/propostas/:id/mensagens`, async ({ request, params }) => {
      const { usuario, resposta } = autenticar(request);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const id = textoDoParametro(params.id);
      const texto = validarTextoMensagem(corpo.texto);
      const erros: string[] = [];
      if (!eUuid(id)) erros.push('id deve ser um UUID válido');
      if (!texto.ok) erros.push(...texto.erros);
      if (erros.length > 0 || !texto.ok) return respostaErros(400, erros);

      if (!participa(id, usuario.usuario.id)) return respostaErro(404, 'proposta não encontrada');
      const status = PARTICIPANTES_PROPOSTA_MOCK[id]?.status;
      if (status === 'recusada' || status === 'expirada') {
        return respostaErro(409, 'proposta encerrada: não é possível enviar mensagens');
      }

      return HttpResponse.json(
        {
          mensagem: {
            id: '99999999-0000-4000-8000-000000000001',
            proposta_id: id,
            remetente_id: usuario.usuario.id,
            texto: texto.texto,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),
  ];
}
