// Novidades da tela "Meus fretes" do motorista (card 027, ADR 0010, CT-09). Funções puras: comparam o
// retrato anterior da lista com o atual e devolvem o texto que a região viva anuncia.
// Fica em lib (e não ao lado da rota) porque todo arquivo de `src/app` vira uma rota do expo-router.
import type { StatusEntrega, StatusPagamento } from './rotulos';

/** Os campos do frete que mudam sozinhos (pagamento feito pela empresa) ou pela ação do motorista. */
export interface FreteAcompanhado {
  id: string;
  tipo_carga: string;
  status_entrega: StatusEntrega;
  coleta_em: string | null;
  entrega_em: string | null;
  status_pagamento: StatusPagamento | null;
}

/**
 * Frases das mudanças de pagamento entre dois retratos, na ordem de `atual`, juntas por ". ":
 * "Pagamento recebido: Grãos (retido até a entrega)" e "Pagamento liberado: Grãos". Devolve `null`
 * quando nada mudou ou falta um dos retratos.
 *
 * Só conta frete que continua no mesmo `status_entrega`: quando o próprio motorista confirma a
 * entrega, o pagamento passa de retido a liberado na mesma resposta e quem anuncia é a ação dele
 * ("Entrega confirmada. Pagamento liberado ao motorista."), sem repetir aqui.
 */
export function descreverMudancasFretes(
  anterior: readonly FreteAcompanhado[] | undefined,
  atual: readonly FreteAcompanhado[] | undefined,
): string | null {
  if (!anterior || !atual) return null;
  const antes = new Map(anterior.map((frete) => [frete.id, frete]));
  const frases: string[] = [];

  for (const frete of atual) {
    const velho = antes.get(frete.id);
    if (!velho || velho.status_entrega !== frete.status_entrega) continue;
    const pagamento = frete.status_pagamento;
    if (pagamento === velho.status_pagamento) continue;
    if (pagamento === 'retido') {
      frases.push(`Pagamento recebido: ${frete.tipo_carga} (retido até a entrega)`);
    } else if (pagamento === 'liberado') {
      frases.push(`Pagamento liberado: ${frete.tipo_carga}`);
    }
  }

  return frases.length === 0 ? null : frases.join('. ');
}

/**
 * Aplica a resposta do `PATCH /fretes/:id/status` no frete de mesmo id da lista (status, datas e
 * pagamento da resposta); os outros fretes e os demais campos ficam como estavam.
 */
export function aplicarStatusFrete<T extends { id: string }>(
  fretes: readonly T[],
  atualizado: Omit<FreteAcompanhado, 'tipo_carga'>,
): T[] {
  return fretes.map((frete) =>
    frete.id === atualizado.id
      ? {
          ...frete,
          status_entrega: atualizado.status_entrega,
          coleta_em: atualizado.coleta_em,
          entrega_em: atualizado.entrega_em,
          status_pagamento: atualizado.status_pagamento,
        }
      : frete,
  );
}
