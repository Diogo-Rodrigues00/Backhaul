// Regras puras da proposta do motorista (card 025, MVP-13): validação do valor da contraproposta e
// leitura dos erros de `POST /propostas`. Fica em lib para os componentes não importarem src/api.
import { ErroApi } from './erros';
import { formatarMoeda, type NumeroEntrada } from './formatacao';
import { paraNumero } from './numeros';
import { numeroPositivo, numeroSemAmbiguidade, obrigatorio, type Validador } from './validacao';

/** Aviso da contraproposta única (D-PO-05): aparece antes do envio e dentro do diálogo. */
export const AVISO_CONTRAPROPOSTA_UNICA = 'Você só pode enviar uma contraproposta para esta carga.';

const MENSAGEM_VALOR_VAZIO = 'Informe o valor da contraproposta.';

/** Valor digitado ("3.200,50", "3200"): a primeira regra que falhar vira a mensagem do campo. */
const REGRAS_DO_VALOR: readonly Validador[] = [obrigatorio, numeroSemAmbiguidade, numeroPositivo];

/** `true` se o texto é um valor válido (número > 0, D-PO-14); senão, a mensagem em pt-BR. */
export function validarValorProposto(texto: string): true | string {
  for (const regra of REGRAS_DO_VALOR) {
    const resultado = regra(texto);
    if (resultado !== true) return regra === obrigatorio ? MENSAGEM_VALOR_VAZIO : resultado;
  }
  return true;
}

/** O texto digitado como número para o corpo da requisição; `null` se não for número. */
export function valorPropostoComoNumero(texto: string): number | null {
  return paraNumero(texto);
}

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
