// Erros da API normalizados (ADR 0005). Fica em lib porque os formulários também
// usam e componentes não importam src/api.

export type TipoErroApi = 'validacao' | 'mensagem' | 'sessao' | 'falha';

/** Texto único para qualquer falha que não pode ser mostrada ao usuário como veio. */
export const MENSAGEM_FALHA = 'Algo deu errado. Tente de novo.';

/** Texto do 401 em requisição autenticada (a mensagem da API não é exibida). */
export const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre de novo.';

type DadosErroApi = {
  tipo: TipoErroApi;
  status: number | null;
  mensagens: string[];
};

export class ErroApi extends Error {
  readonly tipo: TipoErroApi;
  /** Código HTTP, ou null quando não houve resposta (rede, timeout). */
  readonly status: number | null;
  /** Sempre com ao menos uma mensagem, já em pt-BR e segura para exibir. */
  readonly mensagens: string[];

  constructor({ tipo, status, mensagens }: DadosErroApi) {
    super(mensagens[0] ?? MENSAGEM_FALHA);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.status = status;
    this.mensagens = mensagens.length > 0 ? mensagens : [MENSAGEM_FALHA];
  }

  static falha(status: number | null = null): ErroApi {
    return new ErroApi({ tipo: 'falha', status, mensagens: [MENSAGEM_FALHA] });
  }
}

/** Erro 4xx: repetir a mesma requisição não adianta (usado para não tentar de novo). */
export function eErro4xx(erro: unknown): boolean {
  return erro instanceof ErroApi && erro.status !== null && erro.status >= 400 && erro.status < 500;
}

export type MensagensSeparadas<Campo extends string> = {
  /** Primeira mensagem de cada campo da API que apareceu no erro. */
  porCampo: Partial<Record<Campo, string>>;
  /** Mensagens sem campo conhecido (e as repetidas de um campo que já tem mensagem). */
  resumo: string[];
};

/**
 * Distribui as mensagens de um erro de validação. Uma mensagem pertence a um campo
 * quando começa com o nome dele seguido de espaço ("cpf deve ter 11 dígitos" → cpf).
 * Os nomes são os da API; o mapa para o campo do formulário fica na tela (ADR 0007).
 * Erros que não são de validação vão inteiros para o resumo.
 */
export function separarMensagens<Campo extends string>(
  erro: ErroApi,
  campos: readonly Campo[],
): MensagensSeparadas<Campo> {
  const resultado: MensagensSeparadas<Campo> = { porCampo: {}, resumo: [] };
  if (erro.tipo !== 'validacao') {
    resultado.resumo.push(...erro.mensagens);
    return resultado;
  }
  // Nomes mais longos primeiro: "cpf_responsavel" não pode cair em "cpf".
  const ordenados = [...campos].sort((a, b) => b.length - a.length);
  for (const mensagem of erro.mensagens) {
    const campo = ordenados.find((nome) => mensagem.startsWith(`${nome} `));
    if (campo !== undefined && resultado.porCampo[campo] === undefined) {
      resultado.porCampo[campo] = mensagem;
    } else {
      resultado.resumo.push(mensagem);
    }
  }
  return resultado;
}
