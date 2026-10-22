// Cadastro de motorista (MVP-06, D-PO-01, D-PO-14, CT-03): a tela com a API de mock (MSW). O
// expo-router e a sessão são substituídos (roteadorFalso e sessaoFalsa): o fluxo real de entrar e
// abrir a área é coberto por sessao.test.tsx e pelo Playwright (e2e/cadastro-motorista.spec.ts).
import { screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { ErroApi } from '@/lib/erros';
import { roteador } from '@/test-utils/roteadorFalso';
import { sessaoFalsa } from '@/test-utils/sessaoFalsa';
import {
  criarContaCadastroMotorista,
  preencherCadastroMotorista,
  renderizarCadastroMotorista,
} from '@/test-utils/telaCadastroMotorista';

import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../mocks/respostas';

// Substitutos das telas de teste: o `require` dentro da factory é o jeito de o jest.mock apontar para eles.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('expo-router', () => require('@/test-utils/roteadorFalso'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@/state/sessao/useSessao', () => require('@/test-utils/sessaoFalsa'));

beforeEach(() => {
  jest.clearAllMocks();
});

// Ouvinte que guarda o corpo de cada POST /cadastro/motorista (só no teste que confere o corpo).
let ouvinte: ((evento: { request: Request }) => Promise<void>) | undefined;
afterEach(() => {
  if (ouvinte) servidor.events.removeListener('request:start', ouvinte);
  ouvinte = undefined;
});

describe('cadastro de motorista: a tela', () => {
  it('mostra o título, a descrição, os 8 campos com rótulo e o botão', async () => {
    await renderizarCadastroMotorista();

    const titulo = screen.getByRole('heading', { name: 'Cadastro de motorista' });
    expect(titulo.props['aria-level']).toBe(1);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(
      screen.getByText('Seus dados e os do veículo. Leva cerca de um minuto.'),
    ).toBeOnTheScreen();
    for (const rotulo of [
      'E-mail',
      'Senha',
      'Nome completo',
      'CPF',
      'CNH',
      'Tipo de veículo',
      'Placa',
      'Capacidade em kg',
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
  });
});

describe('cadastro de motorista: envio', () => {
  it('201: envia o corpo da API (capacidade como número) e entra com as mesmas credenciais', async () => {
    const corpos: Record<string, unknown>[] = [];
    ouvinte = async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/cadastro/motorista')) {
        corpos.push((await request.clone().json()) as Record<string, unknown>);
      }
    };
    servidor.events.on('request:start', ouvinte);
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ email: 'caminho.feliz@mock.test', capacidade: '12500' });

    await criarContaCadastroMotorista();

    await waitFor(() => expect(sessaoFalsa.entrar).toHaveBeenCalledTimes(1));
    expect(sessaoFalsa.entrar).toHaveBeenCalledWith('caminho.feliz@mock.test', 'senhaSegura8');
    expect(corpos).toEqual([
      {
        email: 'caminho.feliz@mock.test',
        senha: 'senhaSegura8',
        nome_completo: 'João da Silva',
        cpf: '123.456.789-01',
        cnh: '11122233344',
        veiculo_tipo: 'Carreta',
        veiculo_placa: 'ABC1D23',
        capacidade_kg: 12500,
      },
    ]);
    expect(typeof corpos[0]?.capacidade_kg).toBe('number');
    expect(roteador.replace).not.toHaveBeenCalled();
  });

  it('201 com o login automático falhando: leva ao login com o e-mail preenchido (D-PO-01)', async () => {
    jest
      .mocked(sessaoFalsa.entrar)
      .mockRejectedValueOnce(
        new ErroApi({ tipo: 'mensagem', status: 401, mensagens: ['email ou senha inválidos'] }),
      );
    await renderizarCadastroMotorista();
    // CPF próprio: o mock recusa CPF repetido entre os cadastros do mesmo arquivo (409).
    await preencherCadastroMotorista({ email: 'sem.login@mock.test', cpf: '987.654.321-00' });

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(roteador.replace).toHaveBeenCalledWith('/entrar?email=sem.login%40mock.test'),
    );
  });

  it('409: mostra "e-mail ou CPF já cadastrado" no resumo, limpa a senha e mantém o resto', async () => {
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ email: 'existente@mock.test' });

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(screen.getByText('e-mail ou CPF já cadastrado')).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText('Senha').props.value).toBe('');
    expect(screen.getByLabelText('E-mail').props.value).toBe('existente@mock.test');
    expect(screen.getByLabelText('Nome completo').props.value).toBe('João da Silva');
    expect(screen.getByLabelText('CPF').props.value).toBe('123.456.789-01');
    expect(sessaoFalsa.entrar).not.toHaveBeenCalled();
  });

  it('400 por campo: cada mensagem que começa com o nome do campo aparece junto dele (CT-03)', async () => {
    servidor.use(
      http.post(urlMock('/cadastro/motorista'), () =>
        respostaErros(400, [
          'cpf deve ter 11 dígitos',
          'capacidade_kg deve ser um número maior que zero',
        ]),
      ),
    );
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ email: 'erro.campo@mock.test' });

    await criarContaCadastroMotorista();

    await waitFor(() => expect(screen.getByText('cpf deve ter 11 dígitos')).toBeOnTheScreen());
    expect(
      screen.getByText('capacidade_kg deve ser um número maior que zero'),
    ).toBeOnTheScreen();
  });

  it('500 com HTML: mostra a mensagem padrão, nunca o HTML, e oferece "Tentar de novo"', async () => {
    servidor.use(http.post(urlMock('/cadastro/motorista'), () => respostaHtml(500)));
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ email: 'falha.servidor@mock.test' });

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(screen.getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('erro 500 em JSON também vira a mensagem padrão, sem expor o texto da API', async () => {
    servidor.use(
      http.post(urlMock('/cadastro/motorista'), () => respostaErro(500, 'stack: boom')),
    );
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ email: 'json.500@mock.test' });

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(screen.getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('stack: boom')).toBeNull();
  });
});

describe('cadastro de motorista: validação local (D-PO-14)', () => {
  it('formulário vazio não envia e lista os campos no resumo', async () => {
    let chamou = false;
    servidor.use(
      http.post(urlMock('/cadastro/motorista'), () => {
        chamou = true;
        return HttpResponse.json({ erro: 'não deveria chamar' }, { status: 500 });
      }),
    );
    await renderizarCadastroMotorista();

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(screen.getByText('Corrija 8 campos para continuar.')).toBeOnTheScreen(),
    );
    expect(screen.getAllByText('Preencha este campo.').length).toBeGreaterThan(0);
    expect(chamou).toBe(false);
  });

  it('CPF com menos de 11 dígitos e capacidade zero: cada um com a sua mensagem', async () => {
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ cpf: '123.456.789-0', capacidade: '0' });

    await criarContaCadastroMotorista();

    await waitFor(() => expect(screen.getByText('Informe 11 dígitos.')).toBeOnTheScreen());
    expect(screen.getByText('Informe um número maior que zero.')).toBeOnTheScreen();
  });

  it('capacidade com ponto de milhar é recusada (1.234 pode ser 1234 ou 1,234)', async () => {
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ capacidade: '15.000' });

    await criarContaCadastroMotorista();

    await waitFor(() =>
      expect(
        screen.getByText('Use vírgula para decimais e sem ponto de milhar (ex.: 1234 ou 1234,5).'),
      ).toBeOnTheScreen(),
    );
  });

  it('senha com menos de 8 caracteres: mensagem junto do campo', async () => {
    await renderizarCadastroMotorista();
    await preencherCadastroMotorista({ senha: 'curta' });

    await criarContaCadastroMotorista();

    await waitFor(() => expect(screen.getByText('Use pelo menos 8 caracteres.')).toBeOnTheScreen());
  });
});
