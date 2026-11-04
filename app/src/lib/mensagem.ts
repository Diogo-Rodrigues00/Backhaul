// Validação do texto do chat da proposta, antes do POST (ADR 0016, card 042). Espelha
// `validarMensagem` e `contemContato` de backend/src/validacao.ts, com as MESMAS expressões: se o
// Diogo mudar a regra lá, muda aqui também (o `integracao-api` confere a cada onda). A resposta 400
// da API continua sendo a autoridade e aparece no campo.

/** Teto de caracteres de uma mensagem (`MENSAGEM_MAXIMO` no backend). */
export const MENSAGEM_MAXIMO_CARACTERES = 1000;

/** Frase para a pessoa quando o texto traz contato (a da API é técnica demais para o campo). */
export const ERRO_CONTATO_NA_MENSAGEM = 'Não envie telefone, e-mail ou link. Combine tudo por aqui.';
export const ERRO_MENSAGEM_VAZIA = 'Escreva a mensagem.';
export const ERRO_MENSAGEM_LONGA = `Use no máximo ${MENSAGEM_MAXIMO_CARACTERES} caracteres.`;

// Cópia de backend/src/validacao.ts (contemContato).
const REGEX_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+|\barroba\b/i;
const REGEX_TELEFONE = /(?:\d[\s.\-()]*){10,}/;
const REGEX_LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|br|me|ly)\b/i;

/** true se o texto parece trazer telefone, e-mail ou link. */
export function contemContato(texto: string): boolean {
  return REGEX_EMAIL.test(texto) || REGEX_TELEFONE.test(texto) || REGEX_LINK.test(texto);
}

export type ResultadoMensagem = { ok: true; texto: string } | { ok: false; erro: string };

/** Na ordem do backend: obrigatório, tamanho, contato. O texto sai sem espaços nas pontas. */
export function validarMensagem(texto: string): ResultadoMensagem {
  const limpo = texto.trim();
  if (limpo === '') return { ok: false, erro: ERRO_MENSAGEM_VAZIA };
  if (limpo.length > MENSAGEM_MAXIMO_CARACTERES) return { ok: false, erro: ERRO_MENSAGEM_LONGA };
  if (contemContato(limpo)) return { ok: false, erro: ERRO_CONTATO_NA_MENSAGEM };
  return { ok: true, texto: limpo };
}
