// Tipos de chave Pix: rótulo em pt-BR, ajuda e o teclado que cada um pede (card 047). A API é a
// autoridade da validação (e devolve a chave normalizada): aqui só o que ajuda a digitar.
import type { TipoChavePix } from '@/api/tipos';

export const TIPOS_CHAVE_PIX: readonly TipoChavePix[] = [
  'cpf',
  'cnpj',
  'email',
  'telefone',
  'aleatoria',
];

const ROTULOS: Record<TipoChavePix, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
};

/** Valor fora do mapa (tipo novo na API) mostra traço, não "undefined". */
export function rotuloTipoChavePix(tipo: string | null | undefined): string {
  return tipo !== null && tipo !== undefined && tipo in ROTULOS
    ? ROTULOS[tipo as TipoChavePix]
    : '—';
}

export interface ConfiguracaoDoCampoPix {
  inputMode: 'text' | 'numeric' | 'email' | 'tel';
  autoComplete: 'off' | 'email' | 'tel';
  ajuda: string;
}

const CONFIGURACAO: Record<TipoChavePix, ConfiguracaoDoCampoPix> = {
  cpf: {
    inputMode: 'numeric',
    autoComplete: 'off',
    ajuda: 'Os 11 números do CPF. Pontos e traço são aceitos.',
  },
  cnpj: {
    inputMode: 'numeric',
    autoComplete: 'off',
    ajuda: 'Os 14 números do CNPJ. Pontos, barra e traço são aceitos.',
  },
  email: {
    inputMode: 'email',
    autoComplete: 'email',
    ajuda: 'O e-mail cadastrado como chave Pix.',
  },
  telefone: {
    inputMode: 'tel',
    autoComplete: 'tel',
    ajuda: 'Celular com DDD e 9 dígitos. Exemplo: (34) 99999-1234. O +55 é aceito.',
  },
  aleatoria: {
    inputMode: 'text',
    autoComplete: 'off',
    ajuda: 'Chave aleatória copiada do seu banco (código com letras, números e traços).',
  },
};

const PADRAO: ConfiguracaoDoCampoPix = {
  inputMode: 'text',
  autoComplete: 'off',
  ajuda: 'Escolha o tipo da chave para ver como preencher.',
};

export function configuracaoDoCampoPix(tipo: string): ConfiguracaoDoCampoPix {
  return tipo in CONFIGURACAO ? CONFIGURACAO[tipo as TipoChavePix] : PADRAO;
}
