// Novidades da tela "Minhas propostas" do motorista (card 026, ADR 0010, CT-09). Funções puras: comparam
// o retrato anterior da lista com o atual e devolvem o texto que a região viva anuncia ("Proposta
// aceita: Grãos"). Fica em lib (e não ao lado da rota) porque todo arquivo de `src/app` vira uma rota.
import type { StatusProposta } from './rotulos';

/** Os campos da proposta que a tela acompanha: id para casar, tipo da carga e status. */
export interface PropostaAcompanhada {
  id: string;
  tipo_carga: string;
  status: StatusProposta;
}

// Só mudança para um destes status vira frase. "Pendente" não é novidade: o motorista acabou de enviar.
const FRASE_POR_STATUS: Readonly<Partial<Record<StatusProposta, string>>> = {
  aceita: 'Proposta aceita',
  recusada: 'Proposta recusada',
  expirada: 'Proposta expirada',
};

/**
 * Frases das propostas que mudaram de status entre dois retratos, na ordem de `atual`, juntas por ". ":
 * "Proposta aceita: Grãos. Proposta recusada: Produtos químicos". Devolve `null` quando nada mudou ou
 * falta um dos retratos. Proposta nova (sem "antes") não conta: quem a enviou foi o próprio motorista.
 */
export function descreverMudancasPropostas(
  anterior: readonly PropostaAcompanhada[] | undefined,
  atual: readonly PropostaAcompanhada[] | undefined,
): string | null {
  if (!anterior || !atual) return null;
  const antes = new Map(anterior.map((proposta) => [proposta.id, proposta.status]));
  const frases: string[] = [];

  for (const proposta of atual) {
    const statusAnterior = antes.get(proposta.id);
    if (statusAnterior === undefined || statusAnterior === proposta.status) continue;
    const frase = FRASE_POR_STATUS[proposta.status];
    if (frase) frases.push(`${frase}: ${proposta.tipo_carga}`);
  }

  return frases.length > 0 ? frases.join('. ') : null;
}
