// Meus fretes do motorista (MVP-16, card 027): tela real, API de mock (MSW). O polling com tempo
// falso está em motorista-fretes.polling.test.tsx.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import {
  act,
  configure,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import {
  FRETE_ACEITO_ID,
  FRETE_EM_TRANSITO_ID,
  fretesDoMotoristaMock,
} from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import MeusFretes from '../motorista/fretes';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoMeusFretesMotorista.carregar', () => ({
  carregarCorpoMeusFretesMotorista: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoMeusFretesMotorista')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <MeusFretes />
    </CascaContext.Provider>
  );
}

async function abrir(aoSessaoExpirada = () => undefined) {
  entrarComoMock('mock-motorista', aoSessaoExpirada);
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
    { _layout: Raiz, 'motorista/fretes': Tela },
    { initialUrl: '/motorista/fretes' },
  );
  return cliente;
}

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

/** O cartão (article) cujo h2 tem o nome dado. */
function cartao(tipo: string) {
  const titulo = screen.getByRole('heading', { name: tipo });
  const achado = comPapel('article').find(
    (el) => el.props['aria-labelledby'] === titulo.props.nativeID,
  );
  if (!achado) throw new Error(`cartão de ${tipo} não encontrado`);
  return achado;
}

beforeEach(() => {
  anunciado.mockClear();
  focoMovido.mockClear();
});

afterEach(() => sairDoMock());

describe('meus fretes do motorista: leitura (MVP-16)', () => {
  it('mostra o h1, a lista e, em cada frete, tipo, empresa, valor, andamento, datas e pagamento', async () => {
    await abrir();

    expect(await screen.findByRole('heading', { name: 'Produtos inflamáveis' })).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Meus fretes' }).props['aria-level']).toBe(1);
    const lista = comPapel('list').find((el) => el.props['aria-label'] === 'Fretes');
    expect(lista).toBeDefined();
    expect(comPapel('article')).toHaveLength(3);

    // Mesma empresa nos três fretes da fixture.
    expect(screen.getAllByText('Empresa: Transportes Rápidos LTDA')).toHaveLength(3);
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 2.800,00')).toBeOnTheScreen();

    // Datas nulas viram "—": o aceito não tem coleta nem entrega; o em trânsito não tem entrega.
    expect(screen.getAllByText('—')).toHaveLength(3);

    // D-PO-07: rótulos de pagamento.
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
    expect(screen.getByText('Pago, retido até a entrega')).toBeOnTheScreen();
    expect(screen.getByText('Liberado ao motorista')).toBeOnTheScreen();
  });

  it('um botão com o próximo passo por frete; entregue sem botão; nenhum cancelar (D-PO-09)', async () => {
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });

    expect(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirmar entrega de Grãos' })).toBeOnTheScreen();
    expect(within(cartao('Material de construção')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(screen.getByText(/Esta tela atualiza sozinha a cada 10 s/)).toBeOnTheScreen();
  });

  it('CT-02: sem fretes mostra "Nenhum frete ainda" e "Ver minhas propostas"', async () => {
    servidor.use(http.get(urlMock('/fretes/meus'), () => HttpResponse.json({ fretes: [] })));
    await abrir();

    expect(await screen.findByText('Nenhum frete ainda')).toBeOnTheScreen();
    const [link] = screen.getAllByRole('link', { name: 'Ver minhas propostas' });
    expect(link?.props.href).toBe('/motorista/propostas');
  });

  it('CT-01: enquanto carrega, mostra "Carregando fretes…"', async () => {
    servidor.use(
      http.get(urlMock('/fretes/meus'), async () => {
        await new Promise((resolver) => setTimeout(resolver, 300));
        return HttpResponse.json({ fretes: fretesDoMotoristaMock });
      }),
    );
    await abrir();
    expect(screen.getByText('Carregando fretes…')).toBeOnTheScreen();
    expect(await screen.findByRole('heading', { name: 'Produtos inflamáveis' })).toBeOnTheScreen();
  });

  it('CT-03: falha 500 mostra a mensagem padrão e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock('/fretes/meus'), () =>
        falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json({ fretes: fretesDoMotoristaMock }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Produtos inflamáveis' })).toBeOnTheScreen();
  });

  it('CT-04: 401 em qualquer leitura chama o encerramento da sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock('/fretes/meus'), () => respostaErro(401, 'token inválido ou expirado')),
    );
    await abrir(aoSessaoExpirada);
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});

describe('meus fretes do motorista: avançar o status (D-PO-09)', () => {
  it('"Iniciar transporte" pede confirmação e Cancelar não envia nada', async () => {
    const patches = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') patches();
    });
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    expect(
      await screen.findByText('Iniciar o transporte de Produtos inflamáveis?'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('O status passa para Em trânsito e a hora de coleta é registrada.'),
    ).toBeOnTheScreen();
    expect(comPapel('alertdialog')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(patches).not.toHaveBeenCalled();
    servidor.events.removeAllListeners();
  });

  it('aceito → em trânsito: envia o status, atualiza o cartão, anuncia e mostra "Status atualizado."', async () => {
    let corpo: unknown = null;
    servidor.use(
      http.patch(urlMock(`/fretes/${FRETE_ACEITO_ID}/status`), async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({
          frete: {
            id: FRETE_ACEITO_ID,
            valor_final: 3200,
            status_entrega: 'em_transito',
            coleta_em: '2026-10-22T11:30:00.000Z',
            entrega_em: null,
            status_pagamento: null,
          },
        });
      }),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    await screen.findByText('Iniciar o transporte de Produtos inflamáveis?');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar transporte' }));

    expect(await screen.findByText('Status atualizado.')).toBeOnTheScreen();
    expect(corpo).toEqual({ status_entrega: 'em_transito' });
    expect(screen.getByText('O frete está em trânsito.')).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledWith('Transporte iniciado');

    // O cartão passou ao próximo passo: coleta preenchida, botão "Confirmar entrega".
    const doFrete = within(cartao('Produtos inflamáveis'));
    expect(
      doFrete.getByRole('button', { name: 'Confirmar entrega de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(doFrete.getByText(/22\/10\/2026/)).toBeOnTheScreen();
    expect(doFrete.queryByRole('button', { name: /^Iniciar transporte/ })).not.toBeOnTheScreen();
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
  });

  it('frete pago (retido) + "Confirmar entrega": passa a "Liberado ao motorista" e perde o botão', async () => {
    let corpo: unknown = null;
    servidor.use(
      http.patch(urlMock(`/fretes/${FRETE_EM_TRANSITO_ID}/status`), async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({
          frete: {
            id: FRETE_EM_TRANSITO_ID,
            valor_final: 3500,
            status_entrega: 'entregue',
            coleta_em: fretesDoMotoristaMock[1]!.coleta_em,
            entrega_em: '2026-10-22T14:00:00.000Z',
            status_pagamento: 'liberado',
          },
        });
      }),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Grãos' });
    expect(screen.getAllByText('Liberado ao motorista')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar entrega de Grãos' }));
    expect(await screen.findByText('Confirmar a entrega de Grãos?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar entrega' }));

    expect(await screen.findByText('Status atualizado.')).toBeOnTheScreen();
    expect(corpo).toEqual({ status_entrega: 'entregue' });
    expect(
      screen.getByText('Entrega confirmada. Pagamento liberado ao motorista.'),
    ).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledWith('Entrega confirmada. Pagamento liberado ao motorista');
    expect(screen.getAllByText('Liberado ao motorista')).toHaveLength(2);
    expect(within(cartao('Grãos')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText('Pago, retido até a entrega')).not.toBeOnTheScreen();
  });

  it('frete ainda não pago + "Confirmar entrega": entrega confirmada, pagamento continua aguardando', async () => {
    servidor.use(
      http.patch(urlMock(`/fretes/${FRETE_EM_TRANSITO_ID}/status`), () =>
        HttpResponse.json({
          frete: {
            id: FRETE_EM_TRANSITO_ID,
            valor_final: 3500,
            status_entrega: 'entregue',
            coleta_em: fretesDoMotoristaMock[1]!.coleta_em,
            entrega_em: '2026-10-22T14:00:00.000Z',
            status_pagamento: null,
          },
        }),
      ),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Grãos' });

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar entrega de Grãos' }));
    await screen.findByText('Confirmar a entrega de Grãos?');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar entrega' }));

    expect(await screen.findByText('Entrega confirmada.')).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledWith('Entrega confirmada');
    expect(screen.getAllByText('Aguardando pagamento')).toHaveLength(2);
  });

  it('409: mostra a mensagem da API no cartão, fecha o diálogo e recarrega a lista', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/fretes/meus'), () => {
        leituras += 1;
        return HttpResponse.json({ fretes: fretesDoMotoristaMock });
      }),
      http.patch(urlMock(`/fretes/${FRETE_ACEITO_ID}/status`), () =>
        respostaErro(409, 'não é possível mudar o frete de em_transito para em_transito'),
      ),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });
    expect(leituras).toBe(1);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    await screen.findByText('Iniciar o transporte de Produtos inflamáveis?');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar transporte' }));

    expect(
      await screen.findByText('não é possível mudar o frete de em_transito para em_transito'),
    ).toBeOnTheScreen();
    expect(comPapel('alert').length).toBeGreaterThan(0);
    await waitFor(() => expect(leituras).toBe(2));
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(screen.queryByText('Status atualizado.')).not.toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalledWith('Transporte iniciado');
  });

  it('falha 500 ao avançar: o erro aparece dentro do diálogo, que continua aberto', async () => {
    servidor.use(
      http.patch(urlMock(`/fretes/${FRETE_ACEITO_ID}/status`), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    await screen.findByText('Iniciar o transporte de Produtos inflamáveis?');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar transporte' }));

    const dialogo = comPapel('alertdialog')[0];
    expect(dialogo).toBeDefined();
    await waitFor(() =>
      expect(within(dialogo!).getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(comPapel('alertdialog')).toHaveLength(1);
    expect(screen.queryByText('Status atualizado.')).not.toBeOnTheScreen();
  });

  it('"Atualizar" refaz a leitura e anuncia "Lista atualizada"', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/fretes/meus'), () => {
        leituras += 1;
        return HttpResponse.json({ fretes: fretesDoMotoristaMock });
      }),
    );
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });
    expect(leituras).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(leituras).toBe(2));
    await waitFor(() => expect(anunciado).toHaveBeenCalledWith('Lista atualizada'));
  });

  it('depois da ação o foco volta ao cartão do frete', async () => {
    await abrir();
    await screen.findByRole('heading', { name: 'Produtos inflamáveis' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    await screen.findByText('Iniciar o transporte de Produtos inflamáveis?');
    const [modal] = screen.container.queryAll((el) => el.type === 'Modal');
    const aoDesmontar = modal!.props.onDismiss as () => void;
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar transporte' }));
    await screen.findByText('Status atualizado.');

    // O Modal avisa que foi desmontado (onDismiss); só então o diálogo devolve o foco.
    focoMovido.mockClear();
    act(() => aoDesmontar());
    expect(focoMovido).toHaveBeenCalledTimes(1);
    const ref = focoMovido.mock.calls[0]![0] as { current: { props: Record<string, unknown> } };
    expect(ref.current.props.role).toBe('article');
    expect(ref.current.props['aria-labelledby']).toBe(
      cartao('Produtos inflamáveis').props['aria-labelledby'],
    );
  });
});
