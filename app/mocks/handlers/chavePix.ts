// Chave Pix do motorista (card 047): GET e PUT /motorista/chave-pix, COM estado em memória por usuário
// (a chave guardada no PUT volta no GET). Espelha backend/src/validacao.ts (`validarChavePix`):
// CPF/CNPJ/telefone só com dígitos (telefone com 11 dígitos, aceita +55), e-mail e chave aleatória em
// minúsculas, e as mesmas mensagens de erro. Em arquivo próprio para não depender de `comEstado.ts`.
import { http, HttpResponse } from 'msw';

import type { RespostaChavePix, TipoChavePix } from '../../src/api/tipos';
import { cnpjValido, cpfValido } from '../../src/lib/validacao';
import { respostaErros } from '../respostas';
import { autenticar, lerCorpo, textoOuVazio } from './comum';

const TIPOS: readonly TipoChavePix[] = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEM_CHAVE: RespostaChavePix = { chave_pix: null, tipo_chave_pix: null };

const guardadas = new Map<string, RespostaChavePix>();

/** Esvazia as chaves guardadas (use em `beforeEach` dos testes). */
export function reiniciarChavePixMock(): void {
  guardadas.clear();
}

type Resultado =
  | { ok: true; dados: { tipo_chave_pix: TipoChavePix; chave_pix: string } }
  | {
      ok: false;
      erros: string[];
    };

/** Espelho de `validarChavePix` (backend): confere e normaliza a chave conforme o tipo. */
export function validarChavePixMock(corpo: Record<string, unknown>): Resultado {
  const tipo = corpo.tipo_chave_pix as TipoChavePix;
  const bruta = textoOuVazio(corpo.chave_pix);
  if (!TIPOS.includes(tipo)) {
    return { ok: false, erros: [`tipo_chave_pix deve ser ${TIPOS.join(', ')}`] };
  }

  let chave = bruta;
  let valida: boolean;
  if (tipo === 'cpf') {
    chave = bruta.replace(/\D/g, '');
    valida = cpfValido(chave);
  } else if (tipo === 'cnpj') {
    chave = bruta.replace(/\D/g, '');
    valida = cnpjValido(chave);
  } else if (tipo === 'telefone') {
    chave = bruta.replace(/\D/g, '');
    if (chave.length === 13 && chave.startsWith('55')) chave = chave.slice(2);
    valida = /^\d{2}9\d{8}$/.test(chave);
  } else if (tipo === 'email') {
    chave = bruta.toLowerCase();
    valida = REGEX_EMAIL.test(chave) && chave.length <= 140;
  } else {
    chave = bruta.toLowerCase();
    valida = REGEX_UUID.test(chave);
  }

  return valida
    ? { ok: true, dados: { tipo_chave_pix: tipo, chave_pix: chave } }
    : { ok: false, erros: [`chave_pix inválida para o tipo ${tipo}`] };
}

export function criarHandlersChavePix(baseUrl: string) {
  return [
    http.get(`${baseUrl}/motorista/chave-pix`, ({ request }) => {
      const { usuario, resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      return HttpResponse.json(guardadas.get(usuario.usuario.id) ?? SEM_CHAVE);
    }),

    http.put(`${baseUrl}/motorista/chave-pix`, async ({ request }) => {
      const { usuario, resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const validacao = validarChavePixMock(await lerCorpo(request));
      if (!validacao.ok) return respostaErros(400, validacao.erros);
      const salva: RespostaChavePix = { ...validacao.dados };
      guardadas.set(usuario.usuario.id, salva);
      return HttpResponse.json(salva);
    }),
  ];
}
