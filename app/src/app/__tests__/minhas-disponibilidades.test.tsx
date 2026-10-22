// Minhas disponibilidades do motorista (MVP-11, D-PO-03, CT-01 a CT-04, CT-10). Tela real com a área
// protegida e a API de mock (MSW), no formato exato da proposta 4b. Os botões que mudam o estado do
// render (Usar esta, Atualizar, Tentar de novo) estão em arquivos próprios.
import { screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { serializarEscolha } from '@/lib/disponibilidadeAtiva';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
  cartoes,
  caminho,
  linkPorNome,
  listaDeDisponibilidades,
  textoDaAtiva,
  titulosDosCartoes,
} from '@/test-utils/cenarioMinhasDisponibilidades';

import {
  DISPONIBILIDADE_ABERTA_ANTIGA_ID,
  DISPONIBILIDADE_ABERTA_ID,
  DISPONIBILIDADE_EXPIRADA_ID,
  disponibilidadePublicadaMock,
} from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaHtml } from '../../../mocks/respostas';

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

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  await gravar(CHAVES.token, 'mock-motorista');
});

const ROTA_MINHAS = '/disponibilidades/minhas';

describe('Minhas disponibilidades', () => {
  it('mostra o h1, "Publicar disponibilidade" e "Atualizar" com a lista pronta (MVP-11)', async () => {
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    const h1 = screen.getByRole('heading', { name: 'Minhas disponibilidades' });
    expect(h1.props['aria-level']).toBe(1);
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(linkPorNome('Publicar disponibilidade').props.href).toBe(
      '/motorista/disponibilidades/nova',
    );
  });

  it('CT-01: enquanto carrega, mostra "Carregando disponibilidades…" numa região de status', async () => {
    servidor.use(http.get(urlMock(ROTA_MINHAS), () => delay('infinite')));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();

    expect(screen.getByText('Carregando disponibilidades…')).toBeOnTheScreen();
    expect(
      screen.container.queryAll((el) => el.props.role === 'status').length,
    ).toBeGreaterThanOrEqual(1);
    expect(listaDeDisponibilidades()).toHaveLength(0);
    expect(textoDaAtiva()).toBe('carregando');
  });

  it('lista na ordem da API, com local, raio, urgência, prazo, status e propostas (MVP-11, CT-10)', async () => {
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    expect(titulosDosCartoes()).toEqual([
      'Perto de Uberlândia - MG',
      'Perto de Uberaba - MG',
      'Perto de Araguari - MG',
    ]);
    expect(cartoes()).toHaveLength(3);
    expect(screen.getByText('80 km')).toBeOnTheScreen();
    expect(screen.getByText('120 km')).toBeOnTheScreen();
    expect(screen.getByText('50 km')).toBeOnTheScreen();
    expect(screen.getByText('Urgente')).toBeOnTheScreen();
    expect(screen.getAllByText('Normal')).toHaveLength(2);
    // Duas abertas; a de Uberaba, `expirado` na API, aparece como "Expirada" com prazo vencido.
    expect(screen.getAllByText('Aberta')).toHaveLength(2);
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    expect(screen.getAllByText('Expira em')).toHaveLength(2);
    expect(screen.getByText('1 proposta pendente')).toBeOnTheScreen();
    expect(screen.getAllByText('0 propostas pendentes')).toHaveLength(2);
  });

  it('CT-10: aberta com prazo vencido, mesmo se a API disser `aberto`, aparece como "Expirada"', async () => {
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () =>
        HttpResponse.json({
          disponibilidades: [
            {
              ...disponibilidadePublicadaMock,
              status: 'aberto',
              expira_em: '2020-01-01T00:00:00.000Z',
              propostas_pendentes: 0,
            },
          ],
        }),
      ),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.queryByText('Aberta')).toBeNull();
    // Sem nenhuma aberta e no prazo, não há ativa.
    expect(textoDaAtiva()).toBe('nenhuma');
  });

  it('sem escolha manual, a ativa é a mais recente aberta e no prazo, indicada em texto (D-PO-03)', async () => {
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    expect(screen.getAllByText('Ativa')).toHaveLength(1);
    const [primeiro] = cartoes();
    expect(within(primeiro!).getByText('Ativa')).toBeOnTheScreen();
    expect(textoDaAtiva()).toBe(`${DISPONIBILIDADE_ABERTA_ID}|-18.9186|-48.2772|80|urgente`);
  });

  it('"Usar esta" só funciona nas abertas que não são a ativa; nas demais fica desabilitado', async () => {
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    const araguari = screen.getByRole('button', {
      name: 'Usar esta disponibilidade perto de Araguari - MG',
    });
    expect(araguari).toBeEnabled();
    const uberaba = screen.getByRole('button', {
      name: 'Usar esta disponibilidade perto de Uberaba - MG',
    });
    expect(uberaba).toBeDisabled();
    // A ativa (Uberlândia) não oferece o botão.
    expect(
      screen.queryByRole('button', { name: 'Usar esta disponibilidade perto de Uberlândia - MG' }),
    ).toBeNull();
  });

  it('a escolha guardada vale quando ainda está aberta e no prazo', async () => {
    await gravar(
      CHAVES.disponibilidadeAtiva,
      serializarEscolha({ id: DISPONIBILIDADE_ABERTA_ANTIGA_ID }),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await waitFor(() =>
      expect(textoDaAtiva()).toBe(
        `${DISPONIBILIDADE_ABERTA_ANTIGA_ID}|-18.6456|-48.1934|120|normal`,
      ),
    );
    const cartaoAraguari = cartoes()[2]!;
    expect(within(cartaoAraguari).getByText('Ativa')).toBeOnTheScreen();
    expect(screen.getAllByText('Ativa')).toHaveLength(1);
  });

  it('escolha guardada vencida cai na mais recente aberta e no prazo', async () => {
    await gravar(
      CHAVES.disponibilidadeAtiva,
      serializarEscolha({ id: DISPONIBILIDADE_EXPIRADA_ID }),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await waitFor(() => expect(textoDaAtiva().startsWith(DISPONIBILIDADE_ABERTA_ID)).toBe(true));
    expect(within(cartoes()[0]!).getByText('Ativa')).toBeOnTheScreen();
  });

  it('chave guardada com JSON inválido é ignorada: vale a mais recente aberta e no prazo', async () => {
    await gravar(CHAVES.disponibilidadeAtiva, '{quebrado');
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await waitFor(() => expect(textoDaAtiva().startsWith(DISPONIBILIDADE_ABERTA_ID)).toBe(true));
    expect(within(cartoes()[0]!).getByText('Ativa')).toBeOnTheScreen();
  });

  it('escolha guardada cujo id não está na lista real cai na mais recente (sem usar a cópia local)', async () => {
    await gravar(
      CHAVES.disponibilidadeAtiva,
      serializarEscolha({
        id: disponibilidadePublicadaMock.id,
        publicada: disponibilidadePublicadaMock,
      }),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await waitFor(() => expect(textoDaAtiva().startsWith(DISPONIBILIDADE_ABERTA_ID)).toBe(true));
    // A lista é a da API: três cartões, sem a cópia local entre eles.
    expect(cartoes()).toHaveLength(3);
  });

  it('CT-02: sem nenhuma disponibilidade, mostra "Nenhuma disponibilidade publicada" e a ação', async () => {
    servidor.use(http.get(urlMock(ROTA_MINHAS), () => HttpResponse.json({ disponibilidades: [] })));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma disponibilidade publicada' }),
    ).toBeOnTheScreen();
    // Uma no cabeçalho da tela e outra na ação do estado vazio (D-PO-04).
    expect(
      screen.getAllByRole('link', { name: 'Publicar disponibilidade' }).length,
    ).toBeGreaterThanOrEqual(2);
    expect(textoDaAtiva()).toBe('nenhuma');
  });

  it('CT-03: 500 mostra "Algo deu errado. Tente de novo." e nenhuma lista', async () => {
    servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaErro(500, 'erro interno')));
    await abrirMinhasDisponibilidades();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(listaDeDisponibilidades()).toHaveLength(0);
  });

  it('CT-03: erro de negócio (403 com `erro`) mostra o texto da API, não o padrão', async () => {
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();

    expect(await screen.findByText('acesso negado para este tipo de usuário')).toBeOnTheScreen();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });

  describe('plano B: GET /disponibilidades/minhas ainda não existe (404)', () => {
    it('usa a disponibilidade publicada neste aparelho como única entrada, sem erro', async () => {
      servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaHtml(404)));
      await gravar(
        CHAVES.disponibilidadeAtiva,
        serializarEscolha({
          id: 'dddddddd-0000-4000-8000-000000000003',
          publicada: disponibilidadePublicadaMock,
        }),
      );
      await abrirMinhasDisponibilidades();
      await aguardarSessao();
      await aguardarLista();

      expect(titulosDosCartoes()).toEqual(['Perto de Uberlândia - MG']);
      expect(within(cartoes()[0]!).getByText('Ativa')).toBeOnTheScreen();
      expect(screen.getByText('80 km')).toBeOnTheScreen();
      // Sem número vindo da API, a linha das propostas não aparece; e nada de erro técnico.
      expect(screen.queryByText(/propostas? pendentes?/)).toBeNull();
      expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
      expect(textoDaAtiva()).toBe(
        'dddddddd-0000-4000-8000-000000000003|-18.9186|-48.2772|80|urgente',
      );
    });

    it('também com o 404 em JSON do backend (`{ erro }`)', async () => {
      servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaErro(404, 'rota não encontrada')));
      await gravar(
        CHAVES.disponibilidadeAtiva,
        serializarEscolha({
          id: 'dddddddd-0000-4000-8000-000000000003',
          publicada: disponibilidadePublicadaMock,
        }),
      );
      await abrirMinhasDisponibilidades();
      await aguardarSessao();
      await aguardarLista();

      expect(cartoes()).toHaveLength(1);
      expect(screen.queryByText('rota não encontrada')).toBeNull();
    });

    it('sem nada publicado neste aparelho, a lista é o estado vazio (sem erro)', async () => {
      servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaHtml(404)));
      await abrirMinhasDisponibilidades();
      await aguardarSessao();

      expect(
        await screen.findByRole('heading', { name: 'Nenhuma disponibilidade publicada' }),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
      expect(textoDaAtiva()).toBe('nenhuma');
    });

    it('a publicada vencida aparece como "Expirada" e não é ativa', async () => {
      servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaHtml(404)));
      await gravar(
        CHAVES.disponibilidadeAtiva,
        serializarEscolha({
          id: 'dddddddd-0000-4000-8000-000000000003',
          publicada: { ...disponibilidadePublicadaMock, expira_em: '2020-01-01T00:00:00.000Z' },
        }),
      );
      await abrirMinhasDisponibilidades();
      await aguardarSessao();
      await aguardarLista();

      expect(screen.getByText('Expirada')).toBeOnTheScreen();
      expect(textoDaAtiva()).toBe('nenhuma');
    });
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('CT-04: 401 apaga o token e leva ao login', async () => {
    servidor.use(http.get(urlMock(ROTA_MINHAS), () => respostaErro(401, 'token ausente')));
    await abrirMinhasDisponibilidades();

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
  });
});
