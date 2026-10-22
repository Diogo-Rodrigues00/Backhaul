// Cadastro de empresa (card 016, MVP-05): formulário, erros da API (CT-03), envio único (CT-01) e
// entrada automática depois do 201 (D-PO-01). RNTL + MSW (API de mock). A tela é renderizada direto,
// sem o renderRouter: o router só entra como espião de `replace` (o store global de rotas do
// expo-router não se reinicia entre testes, e aqui não precisa dele).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';

import { ErroApi } from '@/lib/erros';
import { renderizar } from '@/test-utils/renderComTema';

import { servidor, urlMock } from '../../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../../mocks/respostas';
import CadastroEmpresa from '../empresa';

// O useSessao é trocado por um espião: o login automático é testado pelo que a tela faz com ele.
const mockEntrar = jest.fn<Promise<void>, [string, string]>();
jest.mock('@/state/sessao/useSessao', () => ({
  useSessao: () => ({
    estado: 'anonimo',
    usuario: null,
    aviso: null,
    entrar: mockEntrar,
    sair: jest.fn(),
  }),
}));

// O router do expo-router só serve para `replace` (login automático) e para o link "Voltar".
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: ReactNode }) => children,
}));

// O <Head> do expo-router só escreve no HTML estático.
jest.mock('expo-router/head', () => ({ __esModule: true, default: () => null }));

// moverFoco usa findNodeHandle, que não tem efeito no renderer de teste.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));

const URL_CADASTRO = urlMock('/cadastro/empresa');

const VALIDOS = {
  email: '  contato@transportesrapidos.com  ',
  senha: 'senhaSegura8',
  razaoSocial: '  Transportes Rápidos LTDA ',
  cnpj: '12.345.678/0001-99',
};

async function renderizarCadastro() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  }
  await renderizar(
    <Envoltorio>
      <CadastroEmpresa />
    </Envoltorio>,
  );
  await screen.findByLabelText('E-mail');
}

async function preencher(valores: Partial<typeof VALIDOS> = {}) {
  const dados = { ...VALIDOS, ...valores };
  await fireEvent.changeText(screen.getByLabelText('E-mail'), dados.email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), dados.senha);
  await fireEvent.changeText(screen.getByLabelText('Razão social'), dados.razaoSocial);
  await fireEvent.changeText(screen.getByLabelText('CNPJ'), dados.cnpj);
}

/** O resumo de erros é `role="alert"`; o RNTL não acha por papel nesse componente, então lê o host. */
function alerta() {
  return screen.container.queryAll((el) => el.props.role === 'alert')[0];
}

async function enviar() {
  fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
}

/** Conta as requisições e segura cada resposta até `liberar()`, para testar o envio duplo. */
function contarRequisicoes() {
  const captura = { chamadas: 0, corpos: [] as unknown[] };
  let liberar!: () => void;
  const segurar = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  servidor.use(
    http.post(URL_CADASTRO, async ({ request }) => {
      captura.chamadas += 1;
      captura.corpos.push(await request.json());
      await segurar;
      return criado();
    }),
  );
  return { captura, liberar };
}

function criado() {
  return HttpResponse.json(
    {
      usuario: {
        id: '88888888-8888-4888-8888-888888888888',
        email: VALIDOS.email.trim(),
        tipo: 'empresa',
        criado_em: '2026-10-21T12:00:00.000Z',
      },
    },
    { status: 201 },
  );
}

beforeEach(() => {
  mockEntrar.mockReset();
  mockEntrar.mockResolvedValue(undefined);
  mockReplace.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Cadastro de empresa', () => {
  it('tem um único h1 com o título e a descrição, e o formulário tem nome acessível', async () => {
    await renderizarCadastro();
    const titulo = screen.getByRole('heading', { name: 'Cadastro de empresa' });
    expect(titulo.props['aria-level']).toBe(1);
    expect(screen.getByText('Para publicar cargas e receber propostas.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cadastro de empresa')).toBeOnTheScreen();
  });

  it('dados válidos: envia o corpo da API (sem espaços sobrando, CNPJ com pontuação) e entra sozinho', async () => {
    const { captura, liberar } = contarRequisicoes();
    liberar();
    await renderizarCadastro();
    await preencher();
    await enviar();

    await waitFor(() => expect(mockEntrar).toHaveBeenCalledTimes(1));
    expect(mockEntrar).toHaveBeenCalledWith('contato@transportesrapidos.com', 'senhaSegura8');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(captura.corpos).toEqual([
      {
        email: 'contato@transportesrapidos.com',
        senha: 'senhaSegura8',
        razao_social: 'Transportes Rápidos LTDA',
        cnpj: '12.345.678/0001-99',
      },
    ]);
  });

  it('409: mostra a mensagem da API no resumo, limpa a senha e mantém os outros dados (MVP-05)', async () => {
    servidor.use(http.post(URL_CADASTRO, () => respostaErro(409, 'e-mail ou CNPJ já cadastrado')));
    await renderizarCadastro();
    await preencher();
    await enviar();

    expect(await screen.findByText('e-mail ou CNPJ já cadastrado')).toBeOnTheScreen();
    expect(alerta()).toHaveTextContent('e-mail ou CNPJ já cadastrado');
    expect(screen.getByLabelText('Senha').props.value).toBe('');
    expect(screen.getByLabelText('E-mail').props.value).toBe(VALIDOS.email);
    expect(screen.getByLabelText('Razão social').props.value).toBe(VALIDOS.razaoSocial);
    expect(screen.getByLabelText('CNPJ').props.value).toBe(VALIDOS.cnpj);
    expect(mockEntrar).not.toHaveBeenCalled();
  });

  it('400: cada mensagem que começa com o nome do campo vai junto dele; as outras vão ao resumo (CT-03)', async () => {
    servidor.use(
      http.post(URL_CADASTRO, () =>
        respostaErros(400, [
          'cnpj deve ter 14 dígitos',
          'email inválido',
          'razao_social é obrigatório',
          'erro geral sem campo',
        ]),
      ),
    );
    await renderizarCadastro();
    await preencher();
    await enviar();

    expect(await screen.findByText('cnpj deve ter 14 dígitos')).toBeOnTheScreen();
    expect(screen.getByLabelText('CNPJ').props['aria-invalid']).toBe(true);
    expect(screen.getByText('email inválido')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail').props['aria-invalid']).toBe(true);
    expect(screen.getByText('razao_social é obrigatório')).toBeOnTheScreen();
    expect(screen.getByLabelText('Razão social').props['aria-invalid']).toBe(true);
    expect(alerta()).toHaveTextContent('erro geral sem campo');
    expect(mockEntrar).not.toHaveBeenCalled();
  });

  it('500 com HTML: texto padrão com "Tentar de novo"; o HTML nunca aparece e o botão reenvia', async () => {
    servidor.use(http.post(URL_CADASTRO, () => respostaHtml(500), { once: true }));
    await renderizarCadastro();
    await preencher();
    await enviar();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.queryByText(/Internal Server Error/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/<html|<pre|at handler/)).not.toBeOnTheScreen();

    servidor.use(http.post(URL_CADASTRO, () => criado()));
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(mockEntrar).toHaveBeenCalledTimes(1));
  });

  it('validação local: nada vai à API e cada campo vazio tem a mensagem (D-PO-14)', async () => {
    const { captura } = contarRequisicoes();
    await renderizarCadastro();
    await enviar();

    expect((await screen.findAllByText('Preencha este campo.')).length).toBeGreaterThanOrEqual(4);
    expect(captura.chamadas).toBe(0);
    expect(mockEntrar).not.toHaveBeenCalled();
  });

  it('validação local: e-mail inválido, senha curta, CNPJ com 13 dígitos e razão social longa', async () => {
    const { captura } = contarRequisicoes();
    await renderizarCadastro();
    await preencher({
      email: 'sem-arroba',
      senha: 'curta',
      cnpj: '1234567890123',
      razaoSocial: 'x'.repeat(151),
    });
    await enviar();

    expect(await screen.findByText('Informe um e-mail válido.')).toBeOnTheScreen();
    expect(screen.getByText('Use pelo menos 8 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('Informe 14 dígitos.')).toBeOnTheScreen();
    expect(screen.getByText('Use no máximo 150 caracteres.')).toBeOnTheScreen();
    expect(captura.chamadas).toBe(0);
  });

  it('clique duplo gera 1 requisição (CT-01) e o botão mostra o progresso', async () => {
    const { captura, liberar } = contarRequisicoes();
    await renderizarCadastro();
    await preencher();

    // O botão troca o nome para "Criando conta…" ao enviar: a referência é guardada antes do primeiro toque.
    const botao = screen.getByRole('button', { name: 'Criar conta' });
    await fireEvent.press(botao);
    await fireEvent.press(botao);
    expect(await screen.findByRole('button', { name: 'Criando conta…' })).toBeOnTheScreen();
    liberar();

    await waitFor(() => expect(mockEntrar).toHaveBeenCalledTimes(1));
    expect(captura.chamadas).toBe(1);
  });

  it('login automático falhando: leva ao login com o e-mail preenchido (D-PO-01)', async () => {
    mockEntrar.mockRejectedValue(
      new ErroApi({ tipo: 'mensagem', status: 401, mensagens: ['email ou senha inválidos'] }),
    );
    const { liberar } = contarRequisicoes();
    liberar();
    await renderizarCadastro();
    await preencher();
    await enviar();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/entrar?email=contato%40transportesrapidos.com'),
    );
  });
});
