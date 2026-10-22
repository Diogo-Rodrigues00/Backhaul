// Apoio aos testes da tela de cadastro de motorista (card 017): renderiza a tela com o tema e o
// cliente de dados, e preenche o formulário pelos rótulos visíveis. O expo-router e a sessão são
// substituídos pelos arquivos roteadorFalso.tsx e sessaoFalsa.ts (ver o jest.mock de cada teste).
// No RNTL 14 `render` e `fireEvent` são assíncronos: sempre com `await`. Sem ele, os `act` se
// sobrepõem e a tela do teste seguinte fica vazia ("overlapping act").
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { criarClienteDeTeste } from '../../mocks/utils-teste';
import CadastroMotorista from '../app/cadastro/motorista';
import { comTema } from './renderComTema';

export const DADOS_VALIDOS = {
  email: 'motorista.teste@mock.test',
  senha: 'senhaSegura8',
  nome: 'João da Silva',
  cpf: '123.456.789-01',
  cnh: '11122233344',
  tipo: 'Carreta',
  placa: 'ABC1D23',
  capacidade: '15000',
};

export type DadosTela = typeof DADOS_VALIDOS;

/** Renderiza `/cadastro/motorista` com o tema e um cliente de dados isolado. */
export async function renderizarCadastroMotorista(): Promise<void> {
  await render(
    comTema(
      <QueryClientProvider client={criarClienteDeTeste()}>
        <CadastroMotorista />
      </QueryClientProvider>,
    ),
  );
}

/** Digita nos oito campos (pelo rótulo visível). */
export async function preencherCadastroMotorista(dados: Partial<DadosTela> = {}): Promise<void> {
  const v = { ...DADOS_VALIDOS, ...dados };
  await fireEvent.changeText(screen.getByLabelText('E-mail'), v.email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), v.senha);
  await fireEvent.changeText(screen.getByLabelText('Nome completo'), v.nome);
  await fireEvent.changeText(screen.getByLabelText('CPF'), v.cpf);
  await fireEvent.changeText(screen.getByLabelText('CNH'), v.cnh);
  await fireEvent.changeText(screen.getByLabelText('Tipo de veículo'), v.tipo);
  await fireEvent.changeText(screen.getByLabelText('Placa'), v.placa);
  await fireEvent.changeText(screen.getByLabelText('Capacidade em kg'), v.capacidade);
}

/** Pressiona "Criar conta". */
export async function criarContaCadastroMotorista(): Promise<void> {
  await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
}
