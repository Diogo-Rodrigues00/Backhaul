// Login (card 015, MVP-03/04, CT-01/03/04, D-PO-11). Tela real + API de mock (MSW).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import { moverFoco } from '@/lib/a11y';
import { apagar, CHAVES } from '@/lib/armazenamento';
import { MENSAGEM_FALHA } from '@/lib/erros';
import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../mocks/respostas';
import { criarClienteDeTeste } from '../../../mocks/utils-teste';
import LayoutAdmin from '../admin/_layout';
import Administrador from '../admin/index';
import LayoutEmpresa from '../empresa/_layout';
import MinhasCargas from '../empresa/cargas/index';
import Entrar from '../entrar';
import Inicio from '../index';
import LayoutMotorista from '../motorista/_layout';
import CargasProximas from '../motorista/cargas';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

// moverFoco usa findNodeHandle (sem efeito no renderer de teste): espiado para ver quem recebe o foco.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));
const moverFocoMock = jest.mocked(moverFoco);

const SENHA = 'senha-valida-123';

function Sonda() {
  const { estado, usuario } = useSessao();
  const pathname = usePathname();
  return (
    <>
      <Text testID="sonda">{`${estado}|${usuario?.tipo ?? '-'}|${usuario?.nome ?? '-'}`}</Text>
      <Text testID="rota">{pathname}</Text>
    </>
  );
}

function Cadastro() {
  return <Text>Escolha o tipo de cadastro</Text>;
}

async function abrir(url: string) {
  function LayoutRaiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={criarClienteDeTeste()}>
          <SessaoProvider>
            <Sonda />
            <Slot />
          </SessaoProvider>
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    {
      _layout: LayoutRaiz,
      index: Inicio,
      entrar: Entrar,
      cadastro: Cadastro,
      'empresa/_layout': LayoutEmpresa,
      'empresa/cargas/index': MinhasCargas,
      'motorista/_layout': LayoutMotorista,
      'motorista/cargas': CargasProximas,
      'admin/_layout': LayoutAdmin,
      'admin/index': Administrador,
    },
    { initialUrl: url },
  );
  // Espera a sessão ser restaurada (sem token = anônimo) antes de o teste mexer na tela.
  await waitFor(() => expect(sonda()).toMatch(/^anonimo|^autenticado/));
}

const sonda = () => screen.getByTestId('sonda').props.children as string;
const caminho = () => screen.getByTestId('rota').props.children as string;
const titulo = (nome: string) => screen.getByRole('heading', { name: nome });
const alertas = () => screen.container.queryAll((el) => el.props.role === 'alert');
const status = () => screen.container.queryAll((el) => el.props.role === 'status');

async function preencher(email: string, senha: string) {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
}

const botaoEntrar = () => screen.getByRole('button', { name: /^Entrar|Entrando/ });

/** Conta as chamadas a `POST /login` (e devolve o login normal do mock depois de um instante). */
function contarLogins() {
  const contador = { chamadas: 0 };
  servidor.use(
    http.post(urlMock('/login'), async () => {
      contador.chamadas += 1;
      await delay(40);
      return HttpResponse.json({ token: 'mock-empresa', tipo: 'empresa' });
    }),
  );
  return contador;
}

beforeEach(async () => {
  await apagar(CHAVES.token);
  moverFocoMock.mockClear();
});

describe('a tela', () => {
  it('mostra o h1 "Entrar", os dois campos rotulados, "Entrar" e "Criar conta"', async () => {
    await abrir('/entrar');

    expect(titulo('Entrar')).toBeOnTheScreen();
    expect(screen.getByText('Use o e-mail e a senha da sua conta.')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
    expect(screen.getByLabelText('Senha')).toBeOnTheScreen();
    expect(botaoEntrar()).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeOnTheScreen();
    const formularios = screen.container.queryAll(
      (el) => el.props.role === 'form' && el.props['aria-label'] === 'Entrar',
    );
    expect(formularios).toHaveLength(1);
    // A chamada do painel é decorativa: não é um segundo h1.
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('e-mail e senha pedem o preenchimento automático certo (MVP-03)', async () => {
    await abrir('/entrar');

    const campoEmail = screen.getByLabelText('E-mail');
    expect(campoEmail.props.autoComplete).toBe('email');
    expect(campoEmail.props.inputMode).toBe('email');
    expect(campoEmail.props.keyboardType).toBe('email-address');
    const campoSenha = screen.getByLabelText('Senha');
    expect(campoSenha.props.autoComplete).toBe('current-password');
    expect(campoSenha.props.secureTextEntry).toBe(true);
  });

  it('mostrar/ocultar senha é um botão com aria-pressed', async () => {
    await abrir('/entrar');

    const mostrar = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(mostrar.props['aria-pressed']).toBe(false);
    await fireEvent.press(mostrar);
    expect(screen.getByRole('button', { name: 'Ocultar senha' }).props['aria-pressed']).toBe(true);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
  });

  it('"Criar conta" leva a /cadastro', async () => {
    await abrir('/entrar');

    await fireEvent.press(screen.getByRole('link', { name: 'Criar conta' }));
    await waitFor(() => expect(caminho()).toBe('/cadastro'));
  });

  it('?email= preenche o e-mail (D-PO-01)', async () => {
    await abrir('/entrar?email=ana%40exemplo.com');

    await waitFor(() =>
      expect(screen.getByLabelText('E-mail').props.value).toBe('ana@exemplo.com'),
    );
  });
});

describe('perfis (MVP-03)', () => {
  it('empresa abre "Minhas cargas" e o cabeçalho mostra o nome de GET /eu', async () => {
    await abrir('/entrar');
    await preencher('empresa@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(titulo('Minhas cargas')).toBeOnTheScreen();
    // O nome do cabeçalho vem de GET /eu (o cabeçalho só o mostra acima de 1240 px; o e2e confere).
    expect(sonda()).toBe('autenticado|empresa|Transportes Rápidos LTDA');
  });

  it('motorista abre "Cargas próximas"', async () => {
    await abrir('/entrar');
    await preencher('motorista@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    expect(titulo('Cargas próximas')).toBeOnTheScreen();
  });

  it('administrador abre a tela de D-PO-10, com "Sair"', async () => {
    await abrir('/entrar');
    await preencher('admin@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(caminho()).toBe('/admin'));
    expect(titulo('Perfil de administrador sem telas nesta versão')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Sair' }).length).toBeGreaterThan(0);
  });

  it('e-mail com espaços nas pontas e maiúsculas entra do mesmo jeito', async () => {
    await abrir('/entrar');
    await preencher('  Empresa@Mock.test ', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
  });

  it('com sessão já autenticada, abrir /entrar leva à área do perfil', async () => {
    const { gravar } = jest.requireMock('@/lib/armazenamento') as {
      gravar: (chave: string, valor: string) => Promise<void>;
    };
    await gravar(CHAVES.token, 'mock-motorista');
    await abrir('/entrar');

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
  });
});

describe('erros', () => {
  it('401: "E-mail ou senha inválidos" no formulário, foco na mensagem, continua na tela (D-PO-11)', async () => {
    await abrir('/entrar');
    await preencher('desconhecido@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(screen.getByText('E-mail ou senha inválidos')).toBeOnTheScreen());
    expect(alertas()).toHaveLength(1);
    expect(caminho()).toBe('/entrar');
    // Nunca vira "sessão expirada".
    expect(screen.queryByText(/sessão expirou/i)).toBeNull();
    // O alerta (resumo) recebe o foco, e o que foi digitado permanece.
    await waitFor(() => expect(moverFocoMock).toHaveBeenCalled());
    expect(moverFocoMock.mock.calls.at(-1)?.[0].current).not.toBeNull();
    expect(screen.getByLabelText('E-mail').props.value).toBe('desconhecido@mock.test');
    expect(screen.getByLabelText('Senha').props.value).toBe(SENHA);
    expect(sonda()).toBe('anonimo|-|-');
  });

  it('campos vazios: erro junto de cada campo, resumo com links e nenhuma chamada à API (MVP-03)', async () => {
    await abrir('/entrar');
    const contador = contarLogins();
    await fireEvent.press(botaoEntrar());

    await waitFor(() =>
      expect(screen.getByText('Corrija 2 campos para continuar.')).toBeOnTheScreen(),
    );
    expect(screen.getAllByText('Preencha este campo.')).toHaveLength(2);
    expect(screen.getByLabelText('E-mail').props['aria-invalid']).toBe(true);
    expect(screen.getByLabelText('Senha').props['aria-invalid']).toBe(true);
    expect(screen.getByRole('link', { name: 'E-mail: Preencha este campo.' })).toBeOnTheScreen();
    await waitFor(() => expect(moverFocoMock).toHaveBeenCalled());
    expect(contador.chamadas).toBe(0);
  });

  it('e-mail sem formato válido é recusado antes de chamar a API', async () => {
    await abrir('/entrar');
    const contador = contarLogins();
    await preencher('sem-arroba', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(screen.getAllByText('Informe um e-mail válido.')).toHaveLength(1));
    expect(contador.chamadas).toBe(0);
  });

  it('400 com `erros`: cada mensagem vai ao campo que ela nomeia', async () => {
    servidor.use(
      http.post(urlMock('/login'), () =>
        respostaErros(400, ['email inválido', 'senha deve ter no mínimo 8 caracteres']),
      ),
    );
    await abrir('/entrar');
    await preencher('alguem@exemplo.com', 'curta');
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(screen.getByText('email inválido')).toBeOnTheScreen());
    expect(screen.getByText('senha deve ter no mínimo 8 caracteres')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail').props['aria-invalid']).toBe(true);
    expect(screen.getByLabelText('Senha').props['aria-invalid']).toBe(true);
    expect(caminho()).toBe('/entrar');
  });

  it('500 com HTML: "Algo deu errado. Tente de novo." e "Tentar de novo" reenvia (CT-03)', async () => {
    servidor.use(http.post(urlMock('/login'), () => respostaHtml(500)));
    await abrir('/entrar');
    await preencher('empresa@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
    expect(caminho()).toBe('/entrar');

    servidor.resetHandlers();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
  });

  it('500 com JSON e falha de rede também viram o texto padrão (CT-03)', async () => {
    servidor.use(http.post(urlMock('/login'), () => respostaErro(500, 'erro interno')));
    await abrir('/entrar');
    await preencher('empresa@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());
    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    expect(screen.queryByText('erro interno')).toBeNull();

    servidor.use(http.post(urlMock('/login'), () => HttpResponse.error()));
    await fireEvent.press(botaoEntrar());
    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    expect(alertas()).toHaveLength(1);
  });
});

describe('envio único (CT-01)', () => {
  it('clique duplo em "Entrar" faz uma só requisição', async () => {
    await abrir('/entrar');
    const contador = contarLogins();
    await preencher('empresa@mock.test', SENHA);

    const botao = botaoEntrar();
    await act(async () => {
      fireEvent.press(botao);
      fireEvent.press(botao);
    });

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(contador.chamadas).toBe(1);
  });

  it('enquanto envia o botão fica "Entrando…" e não aceita novo toque', async () => {
    await abrir('/entrar');
    const contador = contarLogins();
    await preencher('empresa@mock.test', SENHA);
    await fireEvent.press(botaoEntrar());

    await waitFor(() => expect(screen.getByRole('button', { name: /Entrando/ })).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: /Entrando/ })).toBeBusy();
    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(contador.chamadas).toBe(1);
  });
});

describe('avisos de sessão (MVP-04, CT-04)', () => {
  it('?aviso=sessao-expirada mostra o aviso no topo, como status, e o anuncia', async () => {
    await abrir('/entrar?aviso=sessao-expirada');

    await waitFor(() => expect(screen.getByText('Sua sessão expirou.')).toBeOnTheScreen());
    expect(screen.getByText('Entre de novo.')).toBeOnTheScreen();
    expect(status().length).toBeGreaterThan(0);
    // Não é erro: o aviso não usa o papel de alerta.
    expect(alertas()).toHaveLength(0);
  });

  it('?aviso=conta-nao-encontrada e ?aviso=sem-conexao têm texto próprio', async () => {
    await abrir('/entrar?aviso=conta-nao-encontrada');
    await waitFor(() => expect(screen.getByText('Não encontramos sua conta.')).toBeOnTheScreen());
  });

  it('?aviso=sem-conexao explica que a sessão não pôde ser confirmada', async () => {
    await abrir('/entrar?aviso=sem-conexao');
    await waitFor(() =>
      expect(screen.getByText('Não foi possível confirmar sua sessão.')).toBeOnTheScreen(),
    );
  });

  it('aviso desconhecido ou ausente não mostra nada (o texto nunca vem da URL)', async () => {
    await abrir('/entrar?aviso=<b>oi</b>');
    expect(screen.queryByText('<b>oi</b>')).toBeNull();
    expect(screen.queryByText(/sessão/i)).toBeNull();
    expect(status()).toHaveLength(0);
  });

  it('quem foi mandado ao login por uma área protegida vê o aviso e o foco vai ao h1', async () => {
    const { gravar } = jest.requireMock('@/lib/armazenamento') as {
      gravar: (chave: string, valor: string) => Promise<void>;
    };
    await gravar(CHAVES.token, 'token-vencido');
    await abrir('/motorista/cargas');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await waitFor(() => expect(screen.getByText('Sua sessão expirou.')).toBeOnTheScreen());
    // A área protegida montou primeiro (carga inicial); ao chegar no login o foco vai ao h1.
    const alvos = moverFocoMock.mock.calls.map(
      ([ref]) => ref.current as { props?: { role?: string } },
    );
    expect(alvos.some((no) => no?.props?.role === 'heading')).toBe(true);
  });
});
