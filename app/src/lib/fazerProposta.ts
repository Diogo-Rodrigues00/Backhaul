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
  | 'disponibilidade' // 409 (usada num frete ou vencida) ou 404: aviso com link para republicar/ver
  | 'perfil' // 404: o motorista não tem perfil; repetir não adianta, sem recarregar a lista
  | 'sem-certificacao' // 403: o motorista não tem a certificação exigida; repetir não adianta
  | 'outro'; // 400, 5xx e rede: mensagem no diálogo, que continua aberto para tentar de novo

/** Link que acompanha o aviso no cartão: republicar a disponibilidade ou ver as que existem. */
export type LinkDoAviso = 'publicar' | 'disponibilidades';

export interface ErroDaProposta {
  desfecho: DesfechoErroProposta;
  /** Texto seguro para mostrar (a mensagem da API quando é de negócio, senão o texto padrão). */
  mensagem: string;
  /** Só o desfecho `disponibilidade` tem link: no 409 ("publicar"), no 404 ("disponibilidades"). */
  link?: LinkDoAviso;
}

/** Texto fixo do desfecho `perfil`: a API só diz "perfil de motorista não encontrado". */
export const MENSAGEM_PERFIL_NAO_ENCONTRADO =
  'Não encontramos o seu perfil de motorista, então a proposta não foi enviada. Tentar de novo não resolve.';

/**
 * Lê o erro do `POST /propostas`. A API distingue os 409 e os 404 só pelo texto, por isso a
 * mensagem entra na decisão; qualquer outro caso cai em `outro`, sem perder a mensagem.
 */
export function lerErroDaProposta(erro: unknown): ErroDaProposta {
  if (!(erro instanceof ErroApi)) return { desfecho: 'outro', mensagem: ErroApi.falha().message };
  const mensagem = erro.mensagens.join(' ');
  if (erro.tipo === 'falha' || erro.tipo === 'sessao') return { desfecho: 'outro', mensagem };
  const texto = mensagem.toLowerCase();
  if (erro.status === 409) {
    if (texto.includes('contraproposta')) return { desfecho: 'contraproposta-repetida', mensagem };
    if (texto.includes('disponibilidade')) {
      return { desfecho: 'disponibilidade', mensagem, link: 'publicar' };
    }
    return { desfecho: 'carga-indisponivel', mensagem };
  }
  if (erro.status === 403) return { desfecho: 'sem-certificacao', mensagem };
  if (erro.status === 404) {
    if (texto.includes('perfil de motorista')) {
      return { desfecho: 'perfil', mensagem: MENSAGEM_PERFIL_NAO_ENCONTRADO };
    }
    if (texto.includes('disponibilidade')) {
      return { desfecho: 'disponibilidade', mensagem, link: 'disponibilidades' };
    }
    return { desfecho: 'carga-indisponivel', mensagem };
  }
  return { desfecho: 'outro', mensagem };
}
