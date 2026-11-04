// CPF e CNPJ aleatórios e válidos para os E2E de cadastro (card 037). O mock da API (e a real)
// recusa documento com dígito verificador errado e CPF repetido (409), então cada execução precisa de
// um número novo e que feche a conta. A conta é a de `backend/src/validacao.ts` (módulo 11).

function digitoVerificador(digitos: number[], pesos: readonly number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + (digitos[i] ?? 0) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function digitosAleatorios(quantidade: number): number[] {
  return Array.from({ length: quantidade }, () => Math.floor(Math.random() * 10));
}

// Sequência repetida (111.111.111-11) fecha a conta mas o backend recusa: sorteia de novo.
function repetida(digitos: number[]): boolean {
  return digitos.every((d) => d === digitos[0]);
}

/** CPF válido só com dígitos (11), diferente a cada chamada. */
export function gerarCpf(): string {
  let base = digitosAleatorios(9);
  while (repetida(base)) base = digitosAleatorios(9);
  const d1 = digitoVerificador(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador([...base, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...base, d1, d2].join('');
}

/** CNPJ válido só com dígitos (14), diferente a cada chamada. */
export function gerarCnpj(): string {
  let base = digitosAleatorios(12);
  while (repetida(base)) base = digitosAleatorios(12);
  const d1 = digitoVerificador(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador([...base, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...base, d1, d2].join('');
}
