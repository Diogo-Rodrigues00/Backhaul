// Estado da carga de uma proposta do motorista (card 050): `GET /propostas/minhas` traz `carga_status`
// (calculado pela API: `aberto` vencido vem `expirado`) e `carga_expira_em`. Funções puras: o relógio
// entra por parâmetro, o que deixa os testes com data fixa.
import type { StatusProposta } from './rotulos';
import { estaVencido } from './vencimento';

/**
 * Os campos da proposta que decidem se a carga ainda aceita proposta. Os dois da carga são opcionais
 * porque um backend ainda sem o card 050 não os devolve: sem eles não há como saber, e a carga não é
 * marcada como indisponível.
 */
export interface CargaDaProposta {
  status: StatusProposta;
  /** `aberto | fechado | cancelado | expirado`; texto livre para não quebrar com um valor novo da API. */
  carga_status?: string;
  carga_expira_em?: string;
}

export const ROTULO_CARGA_INDISPONIVEL = 'Carga indisponível';

const MOTIVO_POR_STATUS: Readonly<Record<string, string>> = {
  fechado: 'Esta carga já foi fechada.',
  cancelado: 'A empresa cancelou esta carga.',
  expirado: 'O prazo desta carga acabou.',
};
const MOTIVO_GENERICO = 'Esta carga não está mais aberta.';

/**
 * Por que a carga não aceita mais proposta, em uma frase; `null` se ela segue aberta e no prazo.
 * - A proposta aceita nunca é "indisponível": a carga fechada é o resultado esperado (já virou frete).
 * - `aberto` com `carga_expira_em` vencido conta como expirada (o relógio do aparelho pode estar à
 *   frente da última leitura da API).
 */
export function motivoCargaIndisponivel(
  proposta: CargaDaProposta,
  agora: Date = new Date(),
): string | null {
  if (proposta.status === 'aceita') return null;
  if (!proposta.carga_status) return null;
  if (proposta.carga_status === 'aberto') {
    return estaVencido('aberto', proposta.carga_expira_em, agora)
      ? MOTIVO_POR_STATUS.expirado!
      : null;
  }
  return MOTIVO_POR_STATUS[proposta.carga_status] ?? MOTIVO_GENERICO;
}
