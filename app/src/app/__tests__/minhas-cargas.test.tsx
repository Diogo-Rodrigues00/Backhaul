// Minhas cargas da empresa (MVP-09, CT-01 a CT-04, CT-10). Tela real com a área protegida e a API
// de mock (MSW). Os botões que refazem a leitura (Atualizar, Tentar de novo) estão em arquivos
// próprios: tocar neles deixa o estado do render para o próximo teste do mesmo arquivo.
import { screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  abrirMinhasCargas,
  aguardarLista,
  aguardarSessao,
  caminho,
  linkPorNome,
  listaDeCargas,
} from '@/test-utils/cenarioMinhasCargas';

import { CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

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
  await gravar(CHAVES.token, 'mock-empresa');
});

describe('Minhas cargas', () => {
  it('mostra o h1 e "Publicar carga"; "Atualizar" aparece com a lista pronta (MVP-09)', async () => {
    await abrirMinhasCargas();
    await aguardarSessao();
    await aguardarLista();

    expect(screen.getByRole('heading', { name: 'Minhas cargas' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(linkPorNome('Publicar carga').props.href).toBe('/empresa/cargas/nova');
  });

  it('CT-01: enquanto carrega, mostra "Carregando cargas…" numa região de status e nenhuma lista', async () => {
    servidor.use(http.get(urlMock('/cargas/minhas'), () => delay('infinite')));
    await abrirMinhasCargas();
    await aguardarSessao();

    // `role="status"` fica num View (não acessível por padrão): confere-se pelo texto e pelo role.
    expect(screen.getByText('Carregando cargas…')).toBeOnTheScreen();
    expect(
      screen.container.queryAll((el) => el.props.role === 'status').length,
    ).toBeGreaterThanOrEqual(1);
    expect(listaDeCargas()).toHaveLength(0);
  });

  it('lista as cargas na ordem da API, com as quatro situações (MVP-09, CT-10)', async () => {
    await abrirMinhasCargas();
    await aguardarSessao();
    await aguardarLista();

    // Só os h2 das cargas (o h1 da tela fica de fora).
    const titulos = screen
      .getAllByRole('heading')
      .filter((h) => h.props['aria-level'] === 2)
      .map((h) => h.props.children);
    expect(titulos).toEqual([
      'Produtos inflamáveis',
      'Grãos',
      'Material de construção',
      'Bobinas de aço',
    ]);
    expect(screen.getAllByText('Aberta')).toHaveLength(2);
    expect(screen.getByText('Fechada')).toBeOnTheScreen();
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    // Grãos, Material de construção e Bobinas de aço não exigem certificação.
    expect(screen.getAllByText('Sem exigência')).toHaveLength(3);
  });

  it('cada carga tem o link "Ver propostas" com nome único e aponta para detalhe com ?id=', async () => {
    await abrirMinhasCargas();
    await aguardarSessao();
    await aguardarLista();

    const link = linkPorNome('Ver propostas de Produtos inflamáveis');
    expect(link.props.href).toBe(`/empresa/cargas/detalhe?id=${CARGA_URGENTE_ID}`);
    expect(screen.getAllByRole('link', { name: /^Ver propostas de / })).toHaveLength(4);
  });

  it('CT-02: lista vazia mostra "Você ainda não publicou cargas" com "Publicar carga"', async () => {
    servidor.use(http.get(urlMock('/cargas/minhas'), () => HttpResponse.json({ cargas: [] })));
    await abrirMinhasCargas();
    await aguardarSessao();

    expect(
      await screen.findByRole('heading', { name: 'Você ainda não publicou cargas' }),
    ).toBeOnTheScreen();
    // Uma no cabeçalho da tela e outra na ação do estado vazio (CT-02).
    expect(screen.getAllByRole('link', { name: 'Publicar carga' }).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('CT-03: 500 mostra "Algo deu errado. Tente de novo." e nenhuma lista', async () => {
    servidor.use(http.get(urlMock('/cargas/minhas'), () => respostaErro(500, 'erro interno')));
    await abrirMinhasCargas();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(listaDeCargas()).toHaveLength(0);
  });

  it('CT-03: erro de negócio (403 com `erro`) mostra o texto da API, não o padrão', async () => {
    servidor.use(
      http.get(urlMock('/cargas/minhas'), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrirMinhasCargas();
    await aguardarSessao();

    expect(await screen.findByText('acesso negado para este tipo de usuário')).toBeOnTheScreen();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('CT-04: 401 apaga o token e leva ao login', async () => {
    servidor.use(http.get(urlMock('/cargas/minhas'), () => respostaErro(401, 'token ausente')));
    await abrirMinhasCargas();

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
