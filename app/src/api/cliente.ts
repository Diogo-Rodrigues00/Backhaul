// Cliente HTTP único do app (ADR 0005). Telas nunca chamam fetch nem response.json().
import { ErroApi, MENSAGEM_SESSAO_EXPIRADA } from '@/lib/erros';

import { obterBaseUrl } from './config';

export type MetodoHttp = 'GET' | 'POST' | 'PATCH';

export type OpcoesRequisicao = {
  corpo?: unknown;
  /** Envia o Bearer e trata 401 como sessão expirada. Falso no login e no cadastro. */
  autenticado?: boolean;
  /** Padrão 60 s: o Render dorme e a primeira chamada pode levar ~50 s. */
  timeoutMs?: number;
};

type ConfiguracaoCliente = {
  obterToken: () => string | null;
  aoSessaoExpirada: () => void;
};

export const TIMEOUT_PADRAO_MS = 60_000;

let configuracao: ConfiguracaoCliente = {
  obterToken: () => null,
  aoSessaoExpirada: () => undefined,
};

// Token cujo 401 já foi avisado: três requisições simultâneas com o mesmo token vencido
// chamam aoSessaoExpirada uma única vez. `undefined` = ainda não avisou.
let tokenJaAvisado: string | null | undefined;

/** Registrado pela sessão (evita import circular entre api e state). Zera o aviso de 401. */
export function configurarCliente(nova: ConfiguracaoCliente): void {
  configuracao = nova;
  tokenJaAvisado = undefined;
}

function avisarSessaoExpirada(tokenUsado: string | null): void {
  // O usuário já saiu ou entrou de novo enquanto a resposta voltava: não há o que expirar.
  if (configuracao.obterToken() !== tokenUsado) {
    return;
  }
  if (tokenJaAvisado === tokenUsado) {
    return;
  }
  tokenJaAvisado = tokenUsado;
  configuracao.aoSessaoExpirada();
}

function lerJson(texto: string): unknown {
  if (texto.trim() === '') {
    return undefined;
  }
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    // Corpo não-JSON (HTML do Express, 413 virando 500): nunca é exibido.
    return undefined;
  }
}

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function textoNaoVazio(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function montarErro(status: number, corpo: unknown, autenticado: boolean): ErroApi {
  const objeto = eObjeto(corpo) ? corpo : {};
  const erros = listaDeTextos(objeto.erros);
  const erro = textoNaoVazio(objeto.erro);

  if (status === 401 && autenticado) {
    return new ErroApi({ tipo: 'sessao', status, mensagens: [MENSAGEM_SESSAO_EXPIRADA] });
  }
  // 5xx nunca vira mensagem da API (nem "erro interno"): texto fixo.
  if (status >= 500) {
    return ErroApi.falha(status);
  }
  if (status === 400 && erros.length > 0) {
    return new ErroApi({ tipo: 'validacao', status, mensagens: erros });
  }
  // 400 com `erro`, 401 do login, 403, 404, 409 e demais 4xx com `erro`.
  if (erro !== null) {
    return new ErroApi({ tipo: 'mensagem', status, mensagens: [erro] });
  }
  // JSON sem erro/erros, corpo vazio ou HTML (404 do Express): sem texto utilizável.
  return ErroApi.falha(status);
}

/**
 * Faz a requisição e devolve o JSON da resposta. Qualquer problema vira ErroApi:
 * - 400 com `erros` → validacao; com `erro` → mensagem;
 * - 401 autenticado → sessao (e avisa a sessão uma vez); 401 do login → mensagem;
 * - 403, 404, 409 com `erro` → mensagem;
 * - 5xx, corpo não-JSON, JSON sem erro/erros, rede e timeout → falha.
 */
export async function requisitar<T>(
  metodo: MetodoHttp,
  caminho: string,
  { corpo, autenticado = true, timeoutMs = TIMEOUT_PADRAO_MS }: OpcoesRequisicao = {},
): Promise<T> {
  const tokenUsado = autenticado ? configuracao.obterToken() : null;
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
  }
  if (tokenUsado !== null) {
    cabecalhos.Authorization = `Bearer ${tokenUsado}`;
  }

  // Fora do try: base ausente é erro de configuração do build, não falha de rede.
  const url = `${obterBaseUrl()}${caminho}`;

  // O cronômetro cobre também a leitura do corpo.
  const controlador = new AbortController();
  const cronometro = setTimeout(() => controlador.abort(), timeoutMs);
  let status: number;
  let ok: boolean;
  let texto: string;
  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controlador.signal,
    });
    status = resposta.status;
    ok = resposta.ok;
    texto = await resposta.text();
  } catch {
    // Falha de rede, timeout (AbortError) ou conexão caída no meio do corpo.
    throw ErroApi.falha();
  } finally {
    clearTimeout(cronometro);
  }

  const dados = lerJson(texto);
  if (!ok) {
    const erro = montarErro(status, dados, autenticado);
    if (erro.tipo === 'sessao') {
      avisarSessaoExpirada(tokenUsado);
    }
    throw erro;
  }
  // Sucesso com corpo ilegível (ex.: HTML de um proxy): não existe dado para devolver.
  if (dados === undefined) {
    throw ErroApi.falha(status);
  }
  return dados as T;
}

/** Monta `?a=1&b=2` sem depender de URLSearchParams (incompleto no React Native). */
export function montarConsulta(parametros: Record<string, string | number>): string {
  const pares = Object.entries(parametros).map(
    ([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`,
  );
  return pares.length > 0 ? `?${pares.join('&')}` : '';
}
