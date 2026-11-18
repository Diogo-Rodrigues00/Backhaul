// Resumo da plataforma do admin (card 040). Tela real com a área protegida e a API de mock (MSW).
// "Atualizar" e "Tentar de novo" estão em arquivos próprios: tocar neles deixa o estado do render
// para o próximo teste do mesmo arquivo.
import { screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  abrirResumoAdmin,
  aguardarResumo,
  aguardarSessao,
  caminho,
  responderResumo,
} from '@/test-utils/cenarioResumoAdmin';

import { resumoAdminMock } from '../../../mocks/fixtures/admin';
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
  await gravar(CHAVES.token, 'mock-admin');
});

const porNivel = (nivel: number) =>
  screen
    .getAllByRole('heading')
    .filter((h) => h.props['aria-level'] === nivel)
    .map((h) => h.props.children);

describe('Resumo da plataforma (admin)', () => {
  it('um h1 e os quatro grupos como h2, com os 11 números e os rótulos em pt-BR', async () => {
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    expect(porNivel(1)).toEqual(['Resumo da plataforma']);
    expect(porNivel(2)).toEqual(['Pessoas', 'Operação', 'Fretes', 'Dinheiro']);

    // Rótulo e valor lidos juntos (ListaDeFatos).
    expect(screen.getByLabelText('Motoristas: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Empresas: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cargas abertas: 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Propostas pendentes: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Certificações aguardando aprovação: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Aceitos: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Em trânsito: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Entregues: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Volume dos fretes entregues: R$ 3.500,00')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão recebida (fretes entregues): R$ 175,00'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão retida (aguardando entrega): R$ 160,00'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
  });

  it('o menu do admin tem o item "Resumo" e há um só Sair, no cabeçalho', async () => {
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    const [link] = screen.getAllByRole('link', { name: 'Resumo' });
    expect(link!.props.href).toBe('/admin');
    expect(screen.getAllByRole('button', { name: 'Sair' })).toHaveLength(1);
    expect(screen.queryByText('Perfil de administrador sem telas nesta versão')).toBeNull();
  });

  it('zero em todos os campos: mostra 0 e R$ 0,00, sem esconder nada', async () => {
    responderResumo({
      ...resumoAdminMock,
      motoristas: 0,
      empresas: 0,
      cargas_abertas: 0,
      propostas_pendentes: 0,
      fretes_aceitos: 0,
      fretes_em_transito: 0,
      fretes_entregues: 0,
      certificacoes_pendentes: 0,
      volume_liberado: 0,
      comissao_total: 0,
      comissao_retida: 0,
    });
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    expect(screen.getByLabelText('Motoristas: 0')).toBeOnTheScreen();
    expect(screen.getByLabelText('Entregues: 0')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão recebida (fretes entregues): R$ 0,00'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão retida (aguardando entrega): R$ 0,00'),
    ).toBeOnTheScreen();
  });

  it('mostra os valores como a API devolveu, sem conta no front (valores em texto)', async () => {
    responderResumo({
      ...resumoAdminMock,
      volume_liberado: '12500.50',
      comissao_total: '625.03',
      comissao_retida: '0.99',
    });
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    expect(screen.getByLabelText('Volume dos fretes entregues: R$ 12.500,50')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão recebida (fretes entregues): R$ 625,03'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Comissão retida (aguardando entrega): R$ 0,99'),
    ).toBeOnTheScreen();
  });

  it('enquanto carrega, mostra "Carregando resumo…" numa região de status e nenhum grupo', async () => {
    servidor.use(http.get(urlMock('/admin/resumo'), () => delay('infinite')));
    await abrirResumoAdmin();
    await aguardarSessao();

    expect(await screen.findByText('Carregando resumo…')).toBeOnTheScreen();
    expect(
      screen.container.queryAll((el) => el.props.role === 'status').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('heading', { name: 'Pessoas' })).toBeNull();
  });

  it('500 mostra "Algo deu errado. Tente de novo." com "Tentar de novo" e nenhum número', async () => {
    servidor.use(http.get(urlMock('/admin/resumo'), () => respostaErro(500, 'erro interno')));
    await abrirResumoAdmin();
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.queryByRole('heading', { name: 'Pessoas' })).toBeNull();
  });

  it('403 mostra o texto da API, não o padrão', async () => {
    servidor.use(
      http.get(urlMock('/admin/resumo'), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrirResumoAdmin();
    await aguardarSessao();

    expect(await screen.findByText('acesso negado para este tipo de usuário')).toBeOnTheScreen();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });

  it('admin sem nome (nome nulo) abre o resumo e o cabeçalho não quebra', async () => {
    servidor.use(
      http.get(urlMock('/eu'), () =>
        HttpResponse.json({
          usuario: {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'admin@mock.test',
            tipo: 'admin',
            ativo: true,
            criado_em: '2026-10-14T19:00:00.000Z',
            nome: null,
          },
        }),
      ),
    );
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    expect(screen.getByRole('heading', { name: 'Resumo da plataforma' })).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'banner')).toHaveLength(1);
    expect(screen.queryByText('null')).toBeNull();
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('401 apaga o token e leva ao login', async () => {
    servidor.use(http.get(urlMock('/admin/resumo'), () => respostaErro(401, 'token ausente')));
    await abrirResumoAdmin();

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
