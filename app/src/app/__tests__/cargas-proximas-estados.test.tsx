// Cargas próximas: estados da tela (CT-01 a CT-04), D-PO-04 (sem ativa) e o plano B de D-PO-05
// (`GET /propostas/minhas` ainda não existe). Tela real + API de mock (MSW).
import { screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { registrarPropostaEnviada } from '@/lib/propostasEnviadas';
import {
  abrirCargasProximas,
  aguardarLista,
  aguardarSessao,
  caminho,
  cartoes,
  linkPorNome,
  listaDeCargas,
} from '@/test-utils/cenarioCargasProximas';

import { cargaProximaNormal, cargaProximaUrgente } from '../../../mocks/fixtures/cargas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../mocks/respostas';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
      propostasEnviadas: 'backhaul.propostasEnviadas',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});
jest.mock('@/telas/CorpoCargasProximas.carregar', () => ({
  carregarCorpoCargasProximas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCargasProximas')),
}));

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  await apagar(CHAVES.propostasEnviadas);
  await gravar(CHAVES.token, 'mock-motorista');
});

const ROTA_CARGAS = '/cargas/proximas';

describe('Cargas próximas: estados', () => {
  it('CT-01: enquanto carrega, mostra "Carregando cargas…" numa região de status', async () => {
    servidor.use(http.get(urlMock(ROTA_CARGAS), () => delay('infinite')));
    await abrirCargasProximas();
    await aguardarSessao();

    expect(await screen.findByText('Carregando cargas…')).toBeOnTheScreen();
    expect(
      screen.container.queryAll((el) => el.props.role === 'status').length,
    ).toBeGreaterThanOrEqual(1);
    expect(listaDeCargas()).toHaveLength(0);
  });

  it('CT-02 / D-PO-04: sem disponibilidade ativa, pede para publicar uma e não busca cargas', async () => {
    let buscou = false;
    servidor.use(
      http.get(urlMock('/disponibilidades/minhas'), () =>
        HttpResponse.json({ disponibilidades: [] }),
      ),
      http.get(urlMock(ROTA_CARGAS), () => {
        buscou = true;
        return HttpResponse.json({ cargas: [] });
      }),
    );
    await abrirCargasProximas();
    await aguardarSessao();

    expect(
      await screen.findByRole('heading', {
        name: 'Publique uma disponibilidade para ver cargas perto de você',
      }),
    ).toBeOnTheScreen();
    expect(linkPorNome('Publicar disponibilidade').props.href).toBe(
      '/motorista/disponibilidades/nova',
    );
    expect(screen.queryByText(/Buscando perto de/)).toBeNull();
    expect(listaDeCargas()).toHaveLength(0);
    expect(buscou).toBe(false);
  });

  it('D-PO-04: disponibilidade só vencida também cai no estado "sem ativa"', async () => {
    servidor.use(
      http.get(urlMock('/disponibilidades/minhas'), () =>
        HttpResponse.json({
          disponibilidades: [
            {
              id: 'dddddddd-0000-4000-8000-0000000000bb',
              local: { lat: -18.9186, lng: -48.2772 },
              raio_busca_km: 80,
              urgencia: 'normal',
              status: 'aberto',
              expira_em: '2020-01-01T00:00:00.000Z',
              criado_em: '2019-12-31T00:00:00.000Z',
              propostas_pendentes: 0,
            },
          ],
        }),
      ),
    );
    await abrirCargasProximas();
    await aguardarSessao();

    expect(
      await screen.findByRole('heading', {
        name: 'Publique uma disponibilidade para ver cargas perto de você',
      }),
    ).toBeOnTheScreen();
  });

  it('CT-03: se a lista de disponibilidades falha (500), mostra o erro com "Tentar de novo"', async () => {
    servidor.use(
      http.get(urlMock('/disponibilidades/minhas'), () => respostaErro(500, 'erro interno')),
    );
    await abrirCargasProximas();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('plano B de disponibilidades: com o 404 da rota 4b e a publicada neste aparelho, busca com ela', async () => {
    let consulta = '';
    servidor.use(
      http.get(urlMock('/disponibilidades/minhas'), () => respostaHtml(404)),
      http.get(urlMock(ROTA_CARGAS), ({ request }) => {
        consulta = new URL(request.url).search;
        return HttpResponse.json({ cargas: [cargaProximaNormal] });
      }),
    );
    await gravar(
      CHAVES.disponibilidadeAtiva,
      JSON.stringify({
        id: 'dddddddd-0000-4000-8000-000000000003',
        publicada: {
          id: 'dddddddd-0000-4000-8000-000000000003',
          local: { lat: -19.7469, lng: -47.9319 },
          raio_busca_km: '120.00',
          urgencia: 'urgente',
          status: 'aberto',
          expira_em: new Date(Date.now() + 3_600_000).toISOString(),
          criado_em: new Date().toISOString(),
        },
      }),
    );
    await abrirCargasProximas();
    await aguardarSessao();
    await aguardarLista();

    // Raio guardado como texto da API ("120.00") vira número na busca.
    expect(consulta).toBe('?lat=-19.7469&lng=-47.9319&raio_km=120');
    expect(screen.getByText(/Buscando perto de Uberaba - MG, raio de 120 km/)).toBeOnTheScreen();
  });

  it('lista vazia: "Nenhuma carga aberta num raio de N km" e a ação de raio maior (MVP-12)', async () => {
    servidor.use(http.get(urlMock(ROTA_CARGAS), () => HttpResponse.json({ cargas: [] })));
    await abrirCargasProximas();
    await aguardarSessao();

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma carga aberta num raio de 80 km' }),
    ).toBeOnTheScreen();
    expect(linkPorNome('Publicar disponibilidade com raio maior').props.href).toBe(
      '/motorista/disponibilidades/nova',
    );
    // O contexto da busca e o "Atualizar" continuam à vista.
    expect(screen.getByText(/Buscando perto de Uberlândia - MG/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(listaDeCargas()).toHaveLength(0);
  });

  it('CT-03: 400 mostra a mensagem da API, não o texto padrão', async () => {
    servidor.use(
      http.get(urlMock(ROTA_CARGAS), () =>
        respostaErros(400, ['raio_km deve ser um número maior que zero e até 500']),
      ),
    );
    await abrirCargasProximas();
    await aguardarSessao();

    expect(
      await screen.findByText('raio_km deve ser um número maior que zero e até 500'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });

  it('CT-03: 403 mostra o texto da API', async () => {
    servidor.use(
      http.get(urlMock(ROTA_CARGAS), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrirCargasProximas();
    await aguardarSessao();

    expect(await screen.findByText('acesso negado para este tipo de usuário')).toBeOnTheScreen();
  });

  it('CT-03: 500 mostra "Algo deu errado. Tente de novo." e nenhuma lista', async () => {
    servidor.use(http.get(urlMock(ROTA_CARGAS), () => respostaErro(500, 'erro interno')));
    await abrirCargasProximas();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(listaDeCargas()).toHaveLength(0);
    // A barra de contexto continua dizendo de onde a busca parte.
    expect(screen.getByText(/Buscando perto de Uberlândia - MG/)).toBeOnTheScreen();
  });

  describe('D-PO-05: plano B enquanto GET /propostas/minhas não existe', () => {
    it('404 (rota inexistente): a lista aparece e vale o que este aparelho guardou', async () => {
      servidor.use(http.get(urlMock('/propostas/minhas'), () => respostaHtml(404)));
      await registrarPropostaEnviada(cargaProximaNormal.id, 'contraproposta');
      await abrirCargasProximas();
      await aguardarSessao();
      await aguardarLista();

      await waitFor(() => expect(screen.getAllByText('Proposta enviada')).toHaveLength(1));
      const cartao = cartoes().find(
        (el) => within(el).queryByRole('heading', { name: cargaProximaNormal.tipo_carga }) !== null,
      );
      expect(within(cartao!).getByText('Proposta enviada')).toBeOnTheScreen();
      expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
    });

    it('erro 500 na rota 4a não impede a lista: ela só deixa de marcar', async () => {
      servidor.use(http.get(urlMock('/propostas/minhas'), () => respostaErro(500, 'erro interno')));
      await abrirCargasProximas();
      await aguardarSessao();
      await aguardarLista();

      expect(cartoes()).toHaveLength(10);
      expect(screen.queryByText('Proposta enviada')).toBeNull();
      expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
    });

    it('com a rota real respondendo, a lista da API prevalece sobre o que o aparelho guardou', async () => {
      // O aparelho lembra "Grãos"; a API diz que só "Produtos inflamáveis" tem proposta pendente.
      await registrarPropostaEnviada(cargaProximaNormal.id, 'aceite');
      await abrirCargasProximas();
      await aguardarSessao();
      await aguardarLista();

      await waitFor(() => expect(screen.getAllByText('Proposta enviada')).toHaveLength(1));
      const cartao = cartoes().find(
        (el) =>
          within(el).queryByRole('heading', { name: cargaProximaUrgente.tipo_carga }) !== null,
      );
      expect(within(cartao!).getByText('Proposta enviada')).toBeOnTheScreen();
    });

    it('lista guardada estragada é ignorada sem erro', async () => {
      servidor.use(http.get(urlMock('/propostas/minhas'), () => respostaHtml(404)));
      await gravar(CHAVES.propostasEnviadas, '{quebrado');
      await abrirCargasProximas();
      await aguardarSessao();
      await aguardarLista();

      expect(cartoes()).toHaveLength(10);
      expect(screen.queryByText('Proposta enviada')).toBeNull();
    });
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('CT-04: 401 apaga o token, as propostas guardadas e leva ao login', async () => {
    await registrarPropostaEnviada(cargaProximaNormal.id, 'aceite');
    servidor.use(http.get(urlMock(ROTA_CARGAS), () => respostaErro(401, 'token ausente')));
    await abrirCargasProximas();

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
    await expect(ler(CHAVES.propostasEnviadas)).resolves.toBeNull();
  });
});
