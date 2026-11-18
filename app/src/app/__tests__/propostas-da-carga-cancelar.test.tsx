// Cancelar carga (MVP-21, card 033): botão e diálogo na tela de propostas da carga, com a API de mock
// (MSW). O foco inicial do diálogo ("Voltar") está em DialogoConfirmacao.dom.test.tsx (DOM de verdade).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import {
  configure,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import type { CargaDaEmpresa } from '@/api/tipos';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import {
  CARGA_FECHADA_ID,
  CARGA_URGENTE_ID,
  cargasDaEmpresaMock,
} from '../../../mocks/fixtures/cargas';
import { propostasDaCargaMock } from '../../../mocks/fixtures/propostas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import PropostasDaCarga from '../empresa/cargas/detalhe';

jest.mock('@/telas/CorpoPropostasDaCarga.carregar', () => ({
  carregarCorpoPropostasDaCarga: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoPropostasDaCarga')),
}));

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

// Refs que a tela entrega aos componentes de título (o do resumo da carga e o do estado vazio). O
// espelho abaixo só as guarda e chama o componente real; o teste compara o alvo do foco com o
// `current` dessas mesmas refs.
const mockRefs: { titulo?: { current: unknown }; vazio?: { current: unknown } } = {};

jest.mock('@/components/molecules/ResumoCarga', () => {
  const real = jest.requireActual('@/components/molecules/ResumoCarga');
  return {
    ...real,
    ResumoCarga: function ResumoEspelho(props: { refTitulo?: { current: unknown } }) {
      mockRefs.titulo = props.refTitulo;
      return real.ResumoCarga(props);
    },
  };
});

jest.mock('@/components/molecules/EstadoVazio', () => {
  const real = jest.requireActual('@/components/molecules/EstadoVazio');
  return {
    ...real,
    EstadoVazio: function VazioEspelho(props: { refTitulo?: { current: unknown } }) {
      mockRefs.vazio = props.refTitulo;
      return real.EstadoVazio(props);
    },
  };
});

// No Jest o `onDismiss` do `Modal` não dispara, então o foco que o diálogo devolve ao fechar não
// aconteceria aqui. Este espelho faz só o que o `DialogoConfirmacao` faz ao fechar: chama
// `moverFoco(refRetorno)` com o `current` lido naquele instante. O diálogo em si é testado no DOM
// (DialogoConfirmacao.dom.test.tsx); o que se testa aqui é para qual elemento a tela aponta.
jest.mock('@/components/organisms/DialogoConfirmacao', () => {
  const real = jest.requireActual('@/components/organisms/DialogoConfirmacao');
  // `import` não cabe numa factory de jest.mock (é içada acima dos imports).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    ...real,
    DialogoConfirmacao: function DialogoEspelho(props: { aberto: boolean; refRetorno?: unknown }) {
      const { aberto, refRetorno } = props;
      const estavaAberto = React.useRef(aberto);
      React.useEffect(() => {
        if (estavaAberto.current && !aberto) {
          const { moverFoco: mover } = jest.requireMock('@/lib/a11y') as {
            moverFoco: (ref: unknown) => void;
          };
          const ref = refRetorno as { current?: unknown } | undefined;
          if (ref?.current) mover(refRetorno);
        }
        estavaAberto.current = aberto;
      }, [aberto, refRetorno]);
      return real.DialogoConfirmacao(props);
    },
  };
});

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

// Elemento para onde o último pedido de foco apontou (o `current` do objeto passado a `moverFoco`).
const focoDoFechamento = () => focoMovido.mock.lastCall?.[0].current;
// O foco aponta para o elemento que o título da carga (ou o de "Carga não encontrada") recebeu.
// `null` não conta: é justamente o caso de foco perdido.
const focoEhDoTitulo = () => {
  const alvo = mockRefs.titulo?.current;
  return alvo != null && focoDoFechamento() === alvo;
};
const focoEhDoVazio = () => {
  const alvo = mockRefs.vazio?.current;
  return alvo != null && focoDoFechamento() === alvo;
};

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <PropostasDaCarga />
    </CascaContext.Provider>
  );
}

async function abrir(id: string = CARGA_URGENTE_ID, aoSessaoExpirada = () => undefined) {
  entrarComoMock('mock-empresa', aoSessaoExpirada);
  const cliente = criarClienteDeTeste();
  function Raiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <Slot />
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    { _layout: Raiz, 'empresa/cargas/detalhe': Tela },
    { initialUrl: `/empresa/cargas/detalhe?id=${id}` },
  );
  return cliente;
}

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

const cargaUrgente = (): CargaDaEmpresa => {
  const carga = cargasDaEmpresaMock.find((c) => c.id === CARGA_URGENTE_ID);
  if (!carga) throw new Error('fixture da carga urgente ausente');
  return carga;
};
const cargaComo = (parcial: Partial<CargaDaEmpresa>) => ({ ...cargaUrgente(), ...parcial });

// Com o diálogo fechado só há um "Cancelar carga" (o da tela). Aberto, o do diálogo é o de dentro.
const botaoCancelarCarga = () => screen.queryByRole('button', { name: 'Cancelar carga' });

async function pedirCancelamento() {
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar carga' }));
  await screen.findByText(`Cancelar a carga ${cargaUrgente().tipo_carga}?`);
}

async function confirmarNoDialogo(nome = 'Cancelar carga') {
  const dialogo = comPapel('alertdialog')[0];
  if (!dialogo) throw new Error('diálogo não está aberto');
  await fireEvent.press(within(dialogo).getByRole('button', { name: nome }));
}

beforeEach(() => {
  anunciado.mockClear();
  focoMovido.mockClear();
});

afterEach(() => sairDoMock());

describe('cancelar carga: quando o botão aparece (MVP-21, CT-10)', () => {
  it('aparece em carga aberta e não vencida', async () => {
    await abrir();
    await screen.findByText('Propostas (5)');
    expect(botaoCancelarCarga()).toBeOnTheScreen();
  });

  it('some em carga fechada (virou frete)', async () => {
    await abrir(CARGA_FECHADA_ID);
    expect(await screen.findByText('Fechada')).toBeOnTheScreen();
    expect(botaoCancelarCarga()).toBeNull();
  });

  it('some em carga já cancelada', async () => {
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({ cargas: [cargaComo({ status: 'cancelado' })] }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Cancelada')).toBeOnTheScreen();
    expect(botaoCancelarCarga()).toBeNull();
  });

  it('some em carga com prazo vencido (aberto no banco, vencido pelo expira_em)', async () => {
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({
          cargas: [cargaComo({ expira_em: new Date(Date.now() - 60_000).toISOString() })],
        }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Expirada')).toBeOnTheScreen();
    expect(botaoCancelarCarga()).toBeNull();
  });

  it('some quando a API já devolve status "expirado" em GET /cargas/minhas', async () => {
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({ cargas: [cargaComo({ status: 'expirado' })] }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Expirada')).toBeOnTheScreen();
    expect(botaoCancelarCarga()).toBeNull();
  });
});

describe('cancelar carga: diálogo de confirmação', () => {
  it('avisa que as propostas pendentes serão recusadas; "Voltar" não envia nada', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await screen.findByText('Propostas (5)');

    await pedirCancelamento();
    expect(
      screen.getByText(
        'Ela sai das buscas e as propostas pendentes serão recusadas. Não dá para desfazer.',
      ),
    ).toBeOnTheScreen();
    expect(comPapel('alertdialog')).toHaveLength(1);

    await fireEvent.press(
      within(comPapel('alertdialog')[0]!).getByRole('button', { name: 'Voltar' }),
    );
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(posts).not.toHaveBeenCalled();
    servidor.events.removeAllListeners();
  });
});

describe('cancelar carga: respostas da API', () => {
  it('200: "Cancelada", pendentes "Recusada", aviso, anúncio e releitura de carga e propostas', async () => {
    let cancelada = false;
    const leituras = { cargas: 0, propostas: 0 };
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () => {
        leituras.cargas += 1;
        return HttpResponse.json({
          cargas: [cargaComo({ status: cancelada ? 'cancelado' : 'aberto' })],
        });
      }),
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () => {
        leituras.propostas += 1;
        return HttpResponse.json({
          propostas: propostasDaCargaMock.map((proposta) =>
            cancelada && proposta.status === 'pendente'
              ? { ...proposta, status: 'recusada' }
              : proposta,
          ),
        });
      }),
      http.post(urlMock(`/cargas/${CARGA_URGENTE_ID}/cancelar`), () => {
        cancelada = true;
        return HttpResponse.json({ carga: { id: CARGA_URGENTE_ID, status: 'cancelado' } });
      }),
    );
    await abrir();
    await screen.findByText('Propostas (5)');
    const antes = { ...leituras };

    await pedirCancelamento();
    await confirmarNoDialogo();

    expect(await screen.findByText('Carga cancelada')).toBeOnTheScreen();
    expect(screen.getByText('As propostas pendentes foram recusadas.')).toBeOnTheScreen();
    expect(screen.getByText('Cancelada')).toBeOnTheScreen();
    expect(screen.getAllByText('Recusada')).toHaveLength(5);
    expect(botaoCancelarCarga()).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(0);
    expect(anunciado).toHaveBeenCalledWith('Carga cancelada');
    expect(leituras.cargas).toBeGreaterThan(antes.cargas);
    expect(leituras.propostas).toBeGreaterThan(antes.propostas);
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    // Foco: ao fechar, vai ao título da carga (que continua na tela, agora "Cancelada").
    // Booleano, não `toBe`: a mensagem de erro do `toBe` imprime o elemento, e o expo-router lança ao imprimir.
    await waitFor(() => expect(focoEhDoTitulo()).toBe(true));
  });

  it('409: mostra a mensagem da API, fecha o diálogo e recarrega a carga e as propostas', async () => {
    let fechada = false;
    const leituras = { cargas: 0, propostas: 0 };
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () => {
        leituras.cargas += 1;
        return HttpResponse.json({
          cargas: [cargaComo({ status: fechada ? 'fechado' : 'aberto' })],
        });
      }),
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () => {
        leituras.propostas += 1;
        return HttpResponse.json({ propostas: propostasDaCargaMock });
      }),
      http.post(urlMock(`/cargas/${CARGA_URGENTE_ID}/cancelar`), () => {
        fechada = true;
        return respostaErro(409, 'carga não está mais aberta');
      }),
    );
    await abrir();
    await screen.findByText('Propostas (5)');
    const antes = { ...leituras };

    await pedirCancelamento();
    await confirmarNoDialogo();

    expect(await screen.findByText('carga não está mais aberta')).toBeOnTheScreen();
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(await screen.findByText('Fechada')).toBeOnTheScreen();
    expect(botaoCancelarCarga()).toBeNull();
    expect(leituras.cargas).toBeGreaterThan(antes.cargas);
    expect(leituras.propostas).toBeGreaterThan(antes.propostas);
    expect(anunciado).not.toHaveBeenCalledWith('Carga cancelada');
    // Foco: o botão que abriu o diálogo já sumiu; o foco vai ao título da carga, não ao body.
    await waitFor(() => expect(focoEhDoTitulo()).toBe(true));
  });

  it('404 (carga de outra empresa ou inexistente): a tela cai em "Carga não encontrada"', async () => {
    let sumiu = false;
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({ cargas: sumiu ? [] : [cargaComo({})] }),
      ),
      http.post(urlMock(`/cargas/${CARGA_URGENTE_ID}/cancelar`), () => {
        sumiu = true;
        return respostaErro(404, 'carga não encontrada');
      }),
    );
    await abrir();
    await screen.findByText('Propostas (5)');

    await pedirCancelamento();
    await confirmarNoDialogo();

    expect(await screen.findByText('Carga não encontrada')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Minhas cargas' }).props.href).toBe('/empresa/cargas');
    expect(anunciado).not.toHaveBeenCalledWith('Carga cancelada');
    // Foco: o título "Carga não encontrada" (o botão e o título da carga já saíram da tela).
    await waitFor(() => expect(focoEhDoVazio()).toBe(true));
  });

  it('500 ou falha de rede: o texto padrão aparece dentro do diálogo, que continua aberto', async () => {
    servidor.use(
      http.post(urlMock(`/cargas/${CARGA_URGENTE_ID}/cancelar`), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrir();
    await screen.findByText('Propostas (5)');

    await pedirCancelamento();
    await confirmarNoDialogo();

    const dialogo = comPapel('alertdialog')[0];
    expect(dialogo).toBeDefined();
    await waitFor(() =>
      expect(within(dialogo!).getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(comPapel('alertdialog')).toHaveLength(1);
  });

  it('401 encerra a sessão (CT-04)', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.post(urlMock(`/cargas/${CARGA_URGENTE_ID}/cancelar`), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrir(CARGA_URGENTE_ID, aoSessaoExpirada);
    await screen.findByText('Propostas (5)');

    await pedirCancelamento();
    await confirmarNoDialogo();

    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});
