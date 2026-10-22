// Propostas da carga (MVP-14, card 021): telas reais, API de mock (MSW). O polling com tempo falso
// está em propostas-da-carga.polling.test.tsx.
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

import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { CARGA_FECHADA_ID, CARGA_NORMAL_ID, CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import {
  freteCriadoMock,
  PROPOSTA_PENDENTE_ID,
  propostasDaCargaMock,
} from '../../../mocks/fixtures/propostas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import PropostasDaCarga from '../empresa/cargas/detalhe';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

// Cada tela rende cinco cartões e vários ciclos de busca: o padrão de 1 s é curto no CI.
configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <PropostasDaCarga />
    </CascaContext.Provider>
  );
}

async function abrir(id: string | null = CARGA_URGENTE_ID, aoSessaoExpirada = () => undefined) {
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
    { initialUrl: id === null ? '/empresa/cargas/detalhe' : `/empresa/cargas/detalhe?id=${id}` },
  );
  return cliente;
}

const nomes = () =>
  screen
    .getAllByRole('heading')
    .filter((titulo) => titulo.props['aria-level'] === 3)
    .map((titulo) => titulo.props.children);

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

beforeEach(() => {
  anunciado.mockClear();
  focoMovido.mockClear();
});

afterEach(() => sairDoMock());

describe('propostas da carga: leitura', () => {
  it('mostra o resumo da carga e as propostas na ordem da API, com os dados do motorista', async () => {
    await abrir();

    expect(await screen.findByText('Propostas (5)')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Propostas da carga' }).props['aria-level']).toBe(1);

    const resumo = comPapel('region').find((el) => el.props['aria-label'] === 'Resumo da carga');
    expect(resumo).toBeDefined();
    expect(screen.getByText('Produtos inflamáveis')).toBeOnTheScreen();
    expect(screen.getByText('Uberlândia - MG')).toBeOnTheScreen();
    expect(screen.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(screen.getByText('Aberta')).toBeOnTheScreen();
    expect(screen.getByText('Exige MOPP - Classe 3 Inflamáveis')).toBeOnTheScreen();

    expect(nomes()).toEqual(propostasDaCargaMock.map((p) => p.motorista.nome_completo));
    expect(comPapel('article')).toHaveLength(5);
    expect(screen.getAllByText('Contraproposta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendente')).toHaveLength(4);
    expect(screen.getByText('Recusada')).toBeOnTheScreen();
    expect(screen.getAllByText('Aprovada').length).toBeGreaterThan(0);
    expect(screen.getByText('Não aprovada')).toBeOnTheScreen();
    expect(screen.getAllByText('Validade: 01/05/2027').length).toBeGreaterThan(0);
    expect(screen.getByText('Maria Souza')).toBeOnTheScreen();
    expect(screen.getAllByText('Oferecido: R$ 3.500,00').length).toBe(5);
    // O nome do motorista aparece uma vez por cartão (o resumo não o repete).
    expect(screen.getAllByText('João da Silva')).toHaveLength(1);
  });

  it('Aceitar e Recusar só nas propostas pendentes, com o nome do motorista no rótulo', async () => {
    await abrir();
    await screen.findByText('Propostas (5)');

    expect(screen.getAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: /^Recusar proposta de / })).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Aceitar proposta de Carlos Lima' }),
    ).not.toBeOnTheScreen();
  });

  it('carga com prazo vencido (CT-10): mostra "Expirada" e nenhum botão de resposta', async () => {
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({
          cargas: [
            {
              id: CARGA_URGENTE_ID,
              tipo_carga: 'Produtos inflamáveis',
              origem: { lat: -18.9186, lng: -48.2772 },
              destino: { lat: -19.7469, lng: -47.9319 },
              peso_kg: 8000,
              valor_oferecido: 3500,
              urgencia: 'urgente',
              status: 'aberto',
              certificacao_requerida_id: null,
              expira_em: new Date(Date.now() - 60_000).toISOString(),
              criado_em: new Date(Date.now() - 3_600_000).toISOString(),
              certificacao_exigida: null,
              total_propostas: 5,
            },
          ],
        }),
      ),
    );
    await abrir();
    await screen.findByText('Propostas (5)');
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.queryAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /^Recusar proposta de / })).toHaveLength(0);
  });

  it('carga fechada: propostas pendentes aparecem sem botões', async () => {
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_FECHADA_ID}/propostas`), () =>
        HttpResponse.json({ propostas: propostasDaCargaMock }),
      ),
    );
    await abrir(CARGA_FECHADA_ID);
    await screen.findByText('Propostas (5)');
    expect(screen.getByText('Fechada')).toBeOnTheScreen();
    expect(screen.queryAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(0);
  });

  it('sem propostas: mensagem de vazio com a próxima ação', async () => {
    await abrir(CARGA_NORMAL_ID);
    expect(await screen.findByText('Nenhuma proposta ainda')).toBeOnTheScreen();
    expect(screen.getByText('Esta tela atualiza sozinha.')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Minhas cargas' }).props.href).toBe('/empresa/cargas');
    expect(screen.getByText('Grãos')).toBeOnTheScreen();
  });

  it('id de carga que não é da empresa (404): "Carga não encontrada" e link "Minhas cargas"', async () => {
    await abrir('ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(await screen.findByText('Carga não encontrada')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Minhas cargas' }).props.href).toBe('/empresa/cargas');
    expect(screen.queryByText(/^Propostas \(/)).not.toBeOnTheScreen();
  });

  it('sem id na URL: "Carga não encontrada" sem pedir propostas', async () => {
    const pedidas = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/propostas')) pedidas();
    });
    await abrir(null);
    expect(await screen.findByText('Carga não encontrada')).toBeOnTheScreen();
    expect(pedidas).not.toHaveBeenCalled();
    servidor.events.removeAllListeners();
  });

  it('falha 500: mensagem padrão e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () =>
        falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json({ propostas: propostasDaCargaMock }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Propostas (5)')).toBeOnTheScreen();
  });

  it('401 em qualquer leitura chama o encerramento da sessão (CT-04)', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrir(CARGA_URGENTE_ID, aoSessaoExpirada);
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});

describe('propostas da carga: aceitar e recusar (D-PO-08)', () => {
  it('Aceitar pede confirmação, avisa que fecha a carga e Cancelar não envia nada', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await screen.findByText('Propostas (5)');

    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }));
    expect(await screen.findByText('Aceitar a proposta de João da Silva?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'A carga fecha por R$ 3.200,00 e as outras propostas pendentes são recusadas. Não dá para desfazer.',
      ),
    ).toBeOnTheScreen();
    expect(comPapel('alertdialog')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(posts).not.toHaveBeenCalled();
    servidor.events.removeAllListeners();
  });

  it('Aceitar confirmado: "Frete criado" com "Ver fretes", propostas e carga atualizadas', async () => {
    let aceita: string | null = null;
    let corpo: unknown = null;
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () =>
        HttpResponse.json({
          propostas: propostasDaCargaMock.map((proposta) => {
            if (aceita === null) return proposta;
            return {
              ...proposta,
              status:
                proposta.id === aceita
                  ? 'aceita'
                  : proposta.status === 'pendente'
                    ? 'recusada'
                    : proposta.status,
            };
          }),
        }),
      ),
      http.get(urlMock('/cargas/minhas'), () =>
        HttpResponse.json({
          cargas: [
            {
              id: CARGA_URGENTE_ID,
              tipo_carga: 'Produtos inflamáveis',
              origem: { lat: -18.9186, lng: -48.2772 },
              destino: { lat: -19.7469, lng: -47.9319 },
              peso_kg: 8000,
              valor_oferecido: 3500,
              urgencia: 'urgente',
              status: aceita === null ? 'aberto' : 'fechado',
              certificacao_requerida_id: null,
              expira_em: new Date(Date.now() + 3_600_000).toISOString(),
              criado_em: new Date(Date.now() - 3_600_000).toISOString(),
              certificacao_exigida: null,
              total_propostas: 5,
            },
          ],
        }),
      ),
      http.post(urlMock(`/propostas/${PROPOSTA_PENDENTE_ID}/responder`), async ({ request }) => {
        corpo = await request.json();
        aceita = PROPOSTA_PENDENTE_ID;
        return HttpResponse.json({ frete: freteCriadoMock });
      }),
    );
    await abrir();
    await screen.findByText('Propostas (5)');

    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }));
    await screen.findByText('Aceitar a proposta de João da Silva?');
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta' }));

    expect(await screen.findByText('Frete criado')).toBeOnTheScreen();
    expect(corpo).toEqual({ acao: 'aceitar' });
    expect(screen.getByRole('link', { name: 'Ver fretes' }).props.href).toBe('/empresa/fretes');
    expect(anunciado).toHaveBeenCalledWith('Frete criado');

    await waitFor(() => expect(screen.getByText('Fechada')).toBeOnTheScreen());
    expect(screen.getByText('Aceita')).toBeOnTheScreen();
    expect(screen.getAllByText('Recusada')).toHaveLength(4);
    expect(screen.queryAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(0);
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
  });

  it('Recusar confirmado: a proposta fica "Recusada" e as demais seguem com botões', async () => {
    let recusada = false;
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () =>
        HttpResponse.json({
          propostas: propostasDaCargaMock.map((proposta) =>
            recusada && proposta.id === PROPOSTA_PENDENTE_ID
              ? { ...proposta, status: 'recusada' }
              : proposta,
          ),
        }),
      ),
      http.post(urlMock(`/propostas/${PROPOSTA_PENDENTE_ID}/responder`), async ({ request }) => {
        expect(await request.json()).toEqual({ acao: 'recusar' });
        recusada = true;
        return HttpResponse.json({ proposta: { id: PROPOSTA_PENDENTE_ID, status: 'recusada' } });
      }),
    );
    await abrir();
    await screen.findByText('Propostas (5)');

    await fireEvent.press(screen.getByRole('button', { name: 'Recusar proposta de João da Silva' }));
    expect(await screen.findByText('Recusar a proposta de João da Silva?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Recusar proposta' }));

    await waitFor(() => expect(screen.getAllByText('Recusada')).toHaveLength(2));
    expect(screen.queryByText('Frete criado')).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Aceitar proposta de / })).toHaveLength(3);
    expect(anunciado).toHaveBeenCalledWith('Proposta de João da Silva recusada');
    // O botão que tinha o foco sumiu: o foco vai ao cartão da proposta.
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
  });

  it('409 (já respondida): mostra a mensagem da API, fecha o diálogo e recarrega a lista', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () => {
        leituras += 1;
        return HttpResponse.json({ propostas: propostasDaCargaMock });
      }),
      http.post(urlMock(`/propostas/${PROPOSTA_PENDENTE_ID}/responder`), () =>
        respostaErro(409, 'proposta já está aceita'),
      ),
    );
    await abrir();
    await screen.findByText('Propostas (5)');
    expect(leituras).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }));
    await screen.findByText('Aceitar a proposta de João da Silva?');
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar proposta' }));

    expect(await screen.findByText('proposta já está aceita')).toBeOnTheScreen();
    expect(comPapel('alert').length).toBeGreaterThan(0);
    await waitFor(() => expect(leituras).toBe(2));
    await waitFor(() => expect(comPapel('alertdialog')).toHaveLength(0));
    expect(screen.queryByText('Frete criado')).not.toBeOnTheScreen();
  });

  it('falha 500 ao responder: o erro aparece dentro do diálogo, que continua aberto', async () => {
    servidor.use(
      http.post(urlMock(`/propostas/${PROPOSTA_PENDENTE_ID}/responder`), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrir();
    await screen.findByText('Propostas (5)');

    await fireEvent.press(screen.getByRole('button', { name: 'Recusar proposta de João da Silva' }));
    await screen.findByText('Recusar a proposta de João da Silva?');
    await fireEvent.press(screen.getByRole('button', { name: 'Recusar proposta' }));

    const dialogo = comPapel('alertdialog')[0];
    expect(dialogo).toBeDefined();
    await waitFor(() =>
      expect(within(dialogo!).getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen(),
    );
    expect(comPapel('alertdialog')).toHaveLength(1);
  });
});

describe('propostas da carga: novidades (CT-09)', () => {
  it('a primeira carga não anuncia; uma proposta nova chega, é anunciada e ganha "Nova"', async () => {
    let total = propostasDaCargaMock.length - 1;
    servidor.use(
      http.get(urlMock(`/cargas/${CARGA_URGENTE_ID}/propostas`), () =>
        HttpResponse.json({ propostas: propostasDaCargaMock.slice(0, total) }),
      ),
    );
    await abrir();
    await screen.findByText('Propostas (4)');
    expect(anunciado).not.toHaveBeenCalledWith('1 nova proposta');
    expect(screen.queryByText('Nova')).not.toBeOnTheScreen();

    total = propostasDaCargaMock.length;
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Propostas (5)')).toBeOnTheScreen();
    await waitFor(() => expect(anunciado).toHaveBeenCalledWith('1 nova proposta'));
    expect(screen.getAllByText('1 nova proposta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nova')).toHaveLength(1);
    expect(screen.getAllByTestId('destaque-proposta', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('o botão "Atualizar" e a barra de novidades estão sempre presentes', async () => {
    await abrir();
    await screen.findByText('Propostas (5)');
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(screen.getByText(/Esta tela atualiza sozinha a cada 10 s/)).toBeOnTheScreen();
  });
});
