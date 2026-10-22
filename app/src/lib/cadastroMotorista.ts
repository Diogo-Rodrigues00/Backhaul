// Cadastro de motorista (MVP-06, D-PO-14): valores do formulário e corpo de POST /cadastro/motorista.
// Função pura, sem API: a tela chama `paraCorpoCadastroMotorista` antes de enviar.
import { paraNumero } from './numeros';

/** Valores do formulário, com os nomes dos campos da tela (camelCase). Tudo texto, como foi digitado. */
export type DadosCadastroMotorista = {
  email: string;
  senha: string;
  nomeCompleto: string;
  cpf: string;
  cnh: string;
  veiculoTipo: string;
  veiculoPlaca: string;
  capacidadeKg: string;
};

/** Corpo do `POST /cadastro/motorista` (docs/api.md). Mesmo formato de `CorpoCadastroMotorista` em `src/api/tipos.ts`. */
export type CorpoCadastroMotoristaApi = {
  email: string;
  senha: string;
  nome_completo: string;
  cpf: string;
  cnh: string;
  veiculo_tipo: string;
  veiculo_placa: string;
  capacidade_kg: number;
};

/**
 * Nome do campo na API → nome do campo no formulário. Usado por `aplicarErroApi`: uma mensagem de
 * 400 que começa com `cpf ` vai para o campo CPF; as demais, para o resumo.
 */
export const CAMPOS_DA_API = {
  email: 'email',
  senha: 'senha',
  nome_completo: 'nomeCompleto',
  cpf: 'cpf',
  cnh: 'cnh',
  veiculo_tipo: 'veiculoTipo',
  veiculo_placa: 'veiculoPlaca',
  capacidade_kg: 'capacidadeKg',
} as const;

/**
 * Monta o corpo da API. A capacidade vai como número (a validação já garantiu que `paraNumero`
 * lê um valor > 0; se não lê, é erro de programação e não se envia 0 em silêncio).
 */
export function paraCorpoCadastroMotorista(
  dados: DadosCadastroMotorista,
): CorpoCadastroMotoristaApi {
  const capacidade = paraNumero(dados.capacidadeKg);
  if (capacidade === null) {
    throw new Error('capacidadeKg sem número: a validação local deveria ter barrado.');
  }
  return {
    email: dados.email.trim(),
    senha: dados.senha,
    nome_completo: dados.nomeCompleto.trim(),
    // CPF com pontuação é aceito pela API (ela remove antes de salvar): envia como foi digitado, sem espaços.
    cpf: dados.cpf.trim(),
    cnh: dados.cnh.trim(),
    veiculo_tipo: dados.veiculoTipo.trim(),
    veiculo_placa: dados.veiculoPlaca.trim(),
    capacidade_kg: capacidade,
  };
}
