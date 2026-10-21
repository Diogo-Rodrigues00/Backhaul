// Validadores puros para `rules.validate` do react-hook-form (ADR 0007).
// Cada um devolve `true` ou a mensagem em pt-BR. Espelham só as regras do backend (D-PO-14).
// Vazio não passa: combine `obrigatorio` com os demais quando o campo for obrigatório.

// Tamanhos máximos dos VARCHAR do schema (D-PO-14, relatório 5.5).
export const MAX = {
  email: 150,
  nome_completo: 150,
  razao_social: 150,
  cnh: 20,
  veiculo_tipo: 50,
  veiculo_placa: 10,
  tipo_carga: 80,
} as const;

export type Validador = (valor: unknown) => true | string;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Dígitos com pontuação comum (CPF "123.456.789-01", CNPJ "12.345.678/0001-90").
const DIGITOS_COM_PONTUACAO = /^[\d.\-/\s]+$/;

function comoTexto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

// Aceita "3,5" (digitação pt-BR) e "3.5". Devolve null se não for número.
function comoNumero(valor: unknown): number | null {
  const texto = comoTexto(valor).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null;
  return Number(texto);
}

export const obrigatorio: Validador = (valor) =>
  comoTexto(valor).trim() !== '' || 'Preencha este campo.';

export const email: Validador = (valor) =>
  EMAIL.test(comoTexto(valor).trim()) || 'Informe um e-mail válido.';

const plural = (quantidade: number): string => (quantidade === 1 ? 'caractere' : 'caracteres');

export function minimo(tamanho: number): Validador {
  return (valor) =>
    comoTexto(valor).length >= tamanho || `Use pelo menos ${tamanho} ${plural(tamanho)}.`;
}

export function maximo(tamanho: number): Validador {
  return (valor) => comoTexto(valor).length <= tamanho || `Use no máximo ${tamanho} caracteres.`;
}

// Conta só os dígitos; aceita pontuação (D-PO-14).
export function digitos(quantidade: number): Validador {
  return (valor) => {
    const texto = comoTexto(valor);
    const apenasDigitos = texto.replace(/\D/g, '');
    const formatoValido = texto === '' || DIGITOS_COM_PONTUACAO.test(texto);
    return (
      (formatoValido && apenasDigitos.length === quantidade) || `Informe ${quantidade} dígitos.`
    );
  };
}

export const numeroPositivo: Validador = (valor) => {
  const numero = comoNumero(valor);
  return (numero !== null && numero > 0) || 'Informe um número maior que zero.';
};

export function numeroAte(limite: number): Validador {
  return (valor) => {
    const numero = comoNumero(valor);
    return (
      (numero !== null && numero > 0 && numero <= limite) ||
      `Informe um número maior que zero e até ${limite}.`
    );
  };
}
