import type { StatusEntrega } from "./validacao";

// Regras de dinheiro e de status do frete, sem banco e sem Express: por isso são
// testáveis sozinhas (frete-regras.test.ts). A rota fretes.ts só as usa.

// Comissão da plataforma. "5.00" vai para o banco como texto (percentual_comissao é
// NUMERIC(5,2)); o número 5 é usado na conta em centavos.
export const PERCENTUAL_COMISSAO = 5;

// Para quem cada status pode ir. Lista vazia = fim da linha: nenhuma mudança é
// permitida a partir dele. Record (e não Partial) obriga a ter TODOS os status:
// se um valor novo entrar no ENUM, o build quebra até ele ser incluído aqui.
const TRANSICOES: Record<StatusEntrega, readonly StatusEntrega[]> = {
  aceito: ["em_transito"],
  em_transito: ["entregue"],
  entregue: [],
  cancelado: [],
};

export function transicaoPermitida(atual: StatusEntrega, novo: StatusEntrega): boolean {
  return TRANSICOES[atual].includes(novo);
}

// "3500.00" (como o pg entrega um NUMERIC) → 350000. Só conta com inteiros:
// nada de parseFloat, que transformaria 0.1 em 0.1000000000000000055...
export function textoParaCentavos(valor: string): number {
  const [reais, centavos = ""] = valor.split(".");
  return Number(reais) * 100 + Number(centavos.padEnd(2, "0").slice(0, 2));
}

// 17500 → "175.00". Volta como texto para o banco gravar o valor exato.
export function centavosParaTexto(centavos: number): string {
  return `${Math.trunc(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

// Arredonda para o centavo mais próximo (meio centavo sobe). centavos * percentual é
// inteiro e a divisão por 100 só gera frações exatas (.5, .25...), então o round é seguro.
export function calcularComissaoCentavos(valorCentavos: number): number {
  return Math.round((valorCentavos * PERCENTUAL_COMISSAO) / 100);
}

// Quanto o motorista recebe: valor do frete menos a comissão, tudo em centavos inteiros.
// Comissão + repasse sempre somam o valor do frete (nada some nem sobra no arredondamento).
export function calcularRepasseCentavos(valorCentavos: number): number {
  return valorCentavos - calcularComissaoCentavos(valorCentavos);
}
