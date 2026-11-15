// Novidades da tela "Minhas propostas" do motorista (card 026, ADR 0010, CT-09). Funções puras: comparam
// o retrato anterior da lista com o atual e devolvem o texto que a região viva anuncia ("Proposta
// aceita: Grãos"). Fica em lib (e não ao lado da rota) porque todo arquivo de `src/app` vira uma rota.
import { motivoCargaIndisponivel } from './cargaDaProposta';
import type { StatusProposta } from './rotulos';

/**
 * Os campos da proposta que a tela acompanha: id para casar, tipo da carga, status e (card 050) o estado
 * da carga. Sem `carga_status`, a mudança de carga não é acompanhada (formato antigo da lista).
 */
export interface PropostaAcompanhada {
  id: string;
  tipo_carga: string;
  status: StatusProposta;
  carga_status?: string;
  carga_expira_em?: string;
}

// Só mudança para um destes status vira frase. "Pendente" não é novidade: o motorista acabou de enviar.
const FRASE_POR_STATUS: Readonly<Partial<Record<StatusProposta, string>>> = {
  aceita: 'Proposta aceita',
  recusada: 'Proposta recusada',
  expirada: 'Proposta expirada',
};

function cargaSaiuDoAr(proposta: PropostaAcompanhada): boolean {
  // Só o que a API disse (sem o relógio do aparelho): um prazo que vence sozinho não é "novidade".
  return motivoCargaIndisponivel(proposta, new Date(0)) !== null;
}

/**
 * Frases das propostas que mudaram entre dois retratos, na ordem de `atual`, juntas por ". ":
 * "Proposta aceita: Grãos. Carga indisponível: Produtos químicos". Uma frase por proposta: a mudança de
 * status vale mais; sem ela, a carga que saiu do ar (fechada, cancelada, vencida). Devolve `null` quando
 * nada mudou ou falta um dos retratos. Proposta nova (sem "antes") não conta: quem a enviou foi o
 * próprio motorista.
 */
export function descreverMudancasPropostas(
  anterior: readonly PropostaAcompanhada[] | undefined,
  atual: readonly PropostaAcompanhada[] | undefined,
): string | null {
  if (!anterior || !atual) return null;
  const antes = new Map(anterior.map((proposta) => [proposta.id, proposta]));
  const frases: string[] = [];

  for (const proposta of atual) {
    const anteriorDela = antes.get(proposta.id);
    if (anteriorDela === undefined) continue;
    const frase =
      anteriorDela.status === proposta.status ? undefined : FRASE_POR_STATUS[proposta.status];
    if (frase) {
      frases.push(`${frase}: ${proposta.tipo_carga}`);
    } else if (!cargaSaiuDoAr(anteriorDela) && cargaSaiuDoAr(proposta)) {
      frases.push(`Carga indisponível: ${proposta.tipo_carga}`);
    }
  }

  return frases.length > 0 ? frases.join('. ') : null;
}
