// Sessão, guardas e 401 global (ADR 0006, MVP-03/04, CT-04). Telas reais das áreas, API de mock (MSW).
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, Slot, useGlobalSearchParams, usePathname } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { useState, type ComponentType } from 'react';
import { Platform, Text } from 'react-native';

import { useMinhasCargas } from '@/api/cargas';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { ErroApi } from '@/lib/erros';
import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaQueNaoChega } from '../../../mocks/respostas';
import { criarClienteDeTeste } from '../../../mocks/utils-teste';
import LayoutAdmin from '../admin/_layout';
import Administrador from '../admin/index';
import LayoutEmpresa from '../empresa/_layout';
import MinhasCargas from '../empresa/cargas/index';
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

/** Mostra o estado da sessão para o teste conferir sem depender da largura da janela. */
function Sonda() {
  const { estado, usuario } = useSessao();
  const pathname = usePathname();
  const { aviso } = useGlobalSearchParams<{ aviso?: string }>();
  return (
    <>
      <Text testID="sonda">{`${estado}|${usuario?.nome ?? '-'}|${usuario?.tipo ?? '-'}`}</Text>
      <Text testID="rota">{`${pathname}|${aviso ?? 'sem-aviso'}`}</Text>
    </>
  );
}

/** Tela de login mínima (a de verdade é o card 015): mostra o aviso e chama `entrar`. */
function Entrar() {
  const { entrar } = useSessao();
  const [erro, setErro] = useState('');
  const tentar = (email: string) => async () => {
    try {
      await entrar(email, 'senha-valida-123');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.mensagens.join(' ') : 'erro desconhecido');
    }
  };
  return (
    <>
      <Text testID="erro-login">{erro}</Text>
      <Text role="button" onPress={tentar('empresa@mock.test')}>
        Entrar como empresa
      </Text>
      <Text role="button" onPress={tentar('motorista@mock.test')}>
        Entrar como motorista
      </Text>
      <Text role="button" onPress={tentar('desconhecido@mock.test')}>
        Entrar com e-mail errado
      </Text>
    </>
  );
}

/** Tela da empresa que também pede dados protegidos (para provocar um 401 fora do `GET /eu`). */
function MinhasCargasComDados() {
  const { cabecalho, abas, habilitado } = useCasca();
  const cargas = useMinhasCargas({ habilitado });
  return (
    <TemplateTela titulo="Minhas cargas" descricao="com dados" cabecalho={cabecalho} abas={abas}>
      <Text testID="cargas">{cargas.isSuccess ? 'carregadas' : 'aguardando'}</Text>
    </TemplateTela>
  );
}

interface Opcoes {
  telaDaEmpresa?: ComponentType;
}

async function abrir(url: string, { telaDaEmpresa = MinhasCargas }: Opcoes = {}) {
  const cliente: QueryClient = criarClienteDeTeste();
  function LayoutRaiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
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
      'empresa/_layout': LayoutEmpresa,
      'empresa/cargas/index': telaDaEmpresa,
      'motorista/_layout': LayoutMotorista,
      'motorista/cargas': CargasProximas,
      'admin/_layout': LayoutAdmin,
      'admin/index': Administrador,
    },
    { initialUrl: url },
  );
  return cliente;
}

const sonda = () => screen.getByTestId('sonda').props.children as string;
const titulo = (nome: string) => screen.getByRole('heading', { name: nome });
const rota = () => screen.getByTestId('rota').props.children as string;
const caminho = () => rota().split('|')[0];

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  jest.mocked(gravar).mockClear();
});

describe('restaurar a sessão', () => {
  it('token válido: continua na área sem novo login (MVP-04) e guarda o nome de GET /eu', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    await abrir('/empresa/cargas');

    await waitFor(() => expect(sonda()).toBe('autenticado|Transportes Rápidos LTDA|empresa'));
    expect(titulo('Minhas cargas')).toBeOnTheScreen();
    expect(caminho()).toBe('/empresa/cargas');
  });

  it('enquanto restaura, a casca e o h1 já aparecem e nada redireciona', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    servidor.use(http.get(urlMock('/eu'), () => respostaQueNaoChega()));
    await abrir('/empresa/cargas');

    expect(sonda()).toBe('restaurando|-|-');
    expect(titulo('Minhas cargas')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'banner')).toHaveLength(1);
    expect(caminho()).toBe('/empresa/cargas');
  });

  it('sem token: vai ao login sem aviso', async () => {
    await abrir('/empresa/cargas');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(sonda()).toBe('anonimo|-|-');
    expect(rota()).toBe('/entrar|sem-aviso');
  });

  it('GET /eu 401: apaga o token e abre o login com o aviso de sessão expirada (CT-04)', async () => {
    await gravar(CHAVES.token, 'token-vencido');
    await abrir('/motorista/cargas');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(rota()).toBe('/entrar|sessao-expirada');
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });

  it('GET /eu 404 (usuário apagado): apaga o token e abre o login com o aviso da conta', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    servidor.use(http.get(urlMock('/eu'), () => respostaErro(404, 'usuário não encontrado')));
    await abrir('/empresa/cargas');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(rota()).toBe('/entrar|conta-nao-encontrada');
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });

  it('falha de rede/5xx no GET /eu: não apaga o token e deixa o app anônimo', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    servidor.use(http.get(urlMock('/eu'), () => respostaErro(500, 'erro interno')));
    await abrir('/empresa/cargas');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(rota()).toBe('/entrar|sem-aviso');
    await expect(ler(CHAVES.token)).resolves.toBe('mock-empresa');
  });
});

describe('guardas por perfil', () => {
  it('motorista que abre /empresa/cargas vai para /motorista/cargas', async () => {
    await gravar(CHAVES.token, 'mock-motorista');
    await abrir('/empresa/cargas');

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    expect(titulo('Cargas próximas')).toBeOnTheScreen();
  });

  it('empresa que abre /motorista/cargas vai para /empresa/cargas', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    await abrir('/motorista/cargas');

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(titulo('Minhas cargas')).toBeOnTheScreen();
  });

  it('admin que abre uma área de outro perfil vai para /admin', async () => {
    await gravar(CHAVES.token, 'mock-admin');
    await abrir('/empresa/cargas');

    await waitFor(() => expect(caminho()).toBe('/admin'));
  });

  it('empresa que abre /admin vai para a própria área', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    await abrir('/admin');

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
  });

  it('/ com sessão autenticada abre a área do perfil', async () => {
    await gravar(CHAVES.token, 'mock-motorista');
    await abrir('/');

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
  });

  it('/ sem sessão continua na apresentação', async () => {
    await abrir('/');

    await waitFor(() => expect(sonda()).toBe('anonimo|-|-'));
    expect(caminho()).toBe('/');
    expect(titulo('Backhaul')).toBeOnTheScreen();
  });
});

describe('área do administrador (D-PO-10)', () => {
  it('mostra "sem telas nesta versão", sem navegação, e o botão Sair encerra a sessão', async () => {
    await gravar(CHAVES.token, 'mock-admin');
    await abrir('/admin');

    await waitFor(() => expect(sonda()).toBe('autenticado|Administrador|admin'));
    expect(titulo('Perfil de administrador sem telas nesta versão')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'navigation')).toHaveLength(0);

    const [sairDoCorpo] = screen.getAllByRole('button', { name: 'Sair' }).slice(-1);
    await act(async () => fireEvent.press(sairDoCorpo!));
    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});

describe('sair', () => {
  it('apaga token e disponibilidade ativa, limpa o cache e abre o login (MVP-04)', async () => {
    await gravar(CHAVES.token, 'mock-motorista');
    await gravar(CHAVES.disponibilidadeAtiva, 'disp-1');
    const cliente = await abrir('/motorista/cargas');
    await waitFor(() => expect(sonda()).toContain('autenticado'));
    cliente.setQueryData(['cargas', 'proximas'], { cargas: ['dados da sessão'] });

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Sair' })));

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(sonda()).toBe('anonimo|-|-');
    expect(rota()).toBe('/entrar|sem-aviso');
    await expect(ler(CHAVES.token)).resolves.toBeNull();
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
    expect(cliente.getQueryCache().getAll()).toHaveLength(0);
  });

  it('voltar a uma área protegida depois de sair não mostra dados nem mantém a sessão', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    const pedidos = jest.fn();
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () => {
        pedidos();
        return HttpResponse.json({ cargas: [] });
      }),
    );
    const cliente = await abrir('/empresa/cargas', { telaDaEmpresa: MinhasCargasComDados });
    await waitFor(() => expect(screen.getByTestId('cargas').props.children).toBe('carregadas'));
    expect(pedidos).toHaveBeenCalledTimes(1);

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Sair' })));
    await waitFor(() => expect(caminho()).toBe('/entrar'));

    // Botão "voltar" do navegador: a guarda devolve ao login, sem cache e sem novo pedido.
    await act(async () => router.push('/empresa/cargas'));
    await waitFor(() => expect(caminho()).toBe('/entrar'));
    // A tela remonta com a consulta parada (sem sessão): nenhum dado da sessão anterior.
    expect(
      cliente
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.data !== undefined),
    ).toEqual([]);
    expect(pedidos).toHaveBeenCalledTimes(1);
  });
});

describe('401 em rota protegida (CT-04)', () => {
  it('qualquer consulta que responde 401 apaga o token e abre o login com o aviso', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    servidor.use(http.get(urlMock('/cargas/minhas'), () => respostaErro(401, 'token expirado')));
    await abrir('/empresa/cargas', { telaDaEmpresa: MinhasCargasComDados });

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(rota()).toBe('/entrar|sessao-expirada');
    await expect(ler(CHAVES.token)).resolves.toBeNull();
    expect(sonda()).toBe('anonimo|-|-');
  });

  it('não pede nada à API enquanto a sessão não estiver autenticada', async () => {
    const chamadas = jest.fn();
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () => {
        chamadas();
        return respostaErro(401, 'sem token');
      }),
    );
    await abrir('/empresa/cargas', { telaDaEmpresa: MinhasCargasComDados });

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    expect(chamadas).not.toHaveBeenCalled();
  });
});

describe('entrar', () => {
  it('empresa: grava o token e abre /empresa/cargas', async () => {
    await abrir('/entrar');
    await waitFor(() => expect(sonda()).toBe('anonimo|-|-'));

    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Entrar como empresa' })),
    );

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(sonda()).toBe('autenticado|Transportes Rápidos LTDA|empresa');
    await expect(ler(CHAVES.token)).resolves.toBe('mock-empresa');
  });

  it('motorista: abre /motorista/cargas', async () => {
    await abrir('/entrar');
    await waitFor(() => expect(sonda()).toBe('anonimo|-|-'));

    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Entrar como motorista' })),
    );

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    await expect(ler(CHAVES.token)).resolves.toBe('mock-motorista');
  });

  it('401 do login é erro do formulário: nada de aviso de sessão, nada guardado, continua no login (D-PO-11)', async () => {
    await abrir('/entrar');
    await waitFor(() => expect(sonda()).toBe('anonimo|-|-'));

    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Entrar com e-mail errado' })),
    );

    await waitFor(() =>
      expect(screen.getByTestId('erro-login').props.children).toBe('email ou senha inválidos'),
    );
    expect(caminho()).toBe('/entrar');
    expect(rota()).toBe('/entrar|sem-aviso');
    expect(sonda()).toBe('anonimo|-|-');
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});

describe('cabeçalho e abas da área (web)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    // O Icone do Jest é o do iPhone, que não entende `var(--…)`; só o aviso do SVG, não o teste.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const navegacoes = () => screen.container.queryAll((el) => el.props.role === 'navigation');
  it('empresa: nome de GET /eu, perfil, os 3 destinos e a página aberta marcada', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    await abrir('/empresa/cargas');
    await waitFor(() => expect(sonda()).toContain('autenticado'));

    const [banner] = screen.container.queryAll((el) => el.props.role === 'banner');
    expect(within(banner!).getByText('Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(within(banner!).getByText('Empresa')).toBeOnTheScreen();
    // Cabeçalho e barra inferior: a mesma lista (o CSS mostra uma de cada vez).
    expect(navegacoes()).toHaveLength(2);
    for (const nav of navegacoes()) {
      expect(within(nav).getAllByRole('link')).toHaveLength(3);
      expect(within(nav).getByRole('link', { name: 'Minhas cargas' }).props['aria-current']).toBe(
        'page',
      );
      expect(within(nav).getByRole('link', { name: 'Publicar carga' })).toBeOnTheScreen();
      expect(within(nav).getByRole('link', { name: 'Meus fretes' })).toBeOnTheScreen();
    }
  });

  it('motorista: os 4 destinos', async () => {
    await gravar(CHAVES.token, 'mock-motorista');
    await abrir('/motorista/cargas');
    await waitFor(() => expect(sonda()).toContain('autenticado'));

    const [nav] = navegacoes();
    for (const rotulo of [
      'Cargas próximas',
      'Disponibilidade',
      'Minhas propostas',
      'Meus fretes',
    ]) {
      expect(within(nav!).getByRole('link', { name: rotulo })).toBeOnTheScreen();
    }
    expect(within(nav!).getByRole('link', { name: 'Cargas próximas' }).props['aria-current']).toBe(
      'page',
    );
  });
});
