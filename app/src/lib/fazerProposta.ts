// Regras puras da proposta do motorista (card 025, MVP-13): textos dos botões e leitura dos erros de
// `POST /propostas`. O valor da contraproposta fica em `valorProposto.ts`: assim o que é só do diálogo
// (baixado sob demanda) não vai para o JS comum, que todas as rotas carregam (ADR 0011).
import { ErroApi } from './erros';
import { formatarMoeda, type NumeroEntrada } from './formatacao';

/** "Grãos, Uberlândia - MG → Uberaba - MG": identifica a carga nos nomes acessíveis dos botões. */
export function descreverCarga(tipoCarga: string, origem: string, destino: string): string {
  return `${tipoCarga}, ${origem} → ${destino}`;
}

export function rotuloAceitar(valorOferecido: NumeroEntrada): string {
  return `Aceitar ${formatarMoeda(valorOferecido)}`;
}

/** O que a tela faz com a falha do envio. */
export type DesfechoErroProposta =
  | 'contraproposta-repetida' // 409: já houve contraproposta; a opção some
  | 'carga-indisponivel' // 409/404 da carga: mensagem e recarrega a lista
  | 'disponibilidade' // 404 da disponibilidade: mensagem e link para Minhas disponibilidades
  | 'sem-certificacao' // 403: o motorista não tem a certificação exigida; repetir não adianta
  | 'outro'; // 400, 5xx e rede: mensagem no diálogo, que continua aberto para tentar de novo

export interface ErroDaProposta {
  desfecho: DesfechoErroProposta;
  /** Texto seguro para mostrar (a mensagem da API quando é de negócio, senão o texto padrão). */
  mensagem: string;
}

/**
 * Lê o erro do `POST /propostas`. A API distingue os dois 409 (e os dois 404) só pelo texto, por
 * isso a mensagem entra na decisão; qualquer outro caso cai em `outro`, sem perder a mensagem.
 */
export function lerErroDaProposta(erro: unknown): ErroDaProposta {
  if (!(erro instanceof ErroApi)) return { desfecho: 'outro', mensagem: ErroApi.falha().message };
  const mensagem = erro.mensagens.join(' ');
  if (erro.tipo === 'falha' || erro.tipo === 'sessao') return { desfecho: 'outro', mensagem };
  const texto = mensagem.toLowerCase();
  if (erro.status === 409) {
    return {
      desfecho: texto.includes('contraproposta') ? 'contraproposta-repetida' : 'carga-indisponivel',
      mensagem,
    };
  }
  if (erro.status === 403) return { desfecho: 'sem-certificacao', mensagem };
  if (erro.status === 404) {
    return {
      desfecho: texto.includes('disponibilidade') ? 'disponibilidade' : 'carga-indisponivel',
      mensagem,
    };
  }
  return { desfecho: 'outro', mensagem };
}
