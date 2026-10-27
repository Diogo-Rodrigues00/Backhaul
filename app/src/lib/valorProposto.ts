// Valor da contraproposta (card 025, MVP-13, D-PO-05, D-PO-14): o aviso de que ela é única e a
// validação do que o motorista digita. Só o diálogo de proposta usa; fica separado de
// `fazerProposta.ts` para sair junto do diálogo, que é baixado sob demanda (ADR 0011).
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
