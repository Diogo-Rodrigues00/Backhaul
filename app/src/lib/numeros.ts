// Valores monetários e de peso vêm do NUMERIC do Postgres e podem chegar como
// texto ("3500.00"). Toda leitura passa por paraNumero (ADR 0005); o envio é
// sempre number. Os campos numéricos dos formulários guardam texto digitado em pt-BR
// ("3,5") e também usam paraNumero no envio (ADR 0007).

export type Numerico = number | string;

const NUMERO_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Converte number ou texto numérico em number. Aceita ponto ("3500.00", como a API) e vírgula
 * ("3,5", como se digita no Brasil); com vírgula, os pontos são separadores de milhar
 * ("1.234,56"). Devolve null se não for um número finito.
 */
export function paraNumero(valor: Numerico | null | undefined): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor !== 'string') {
    return null;
  }
  const texto = valor.trim();
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  return NUMERO_DECIMAL.test(normalizado) ? Number(normalizado) : null;
}
