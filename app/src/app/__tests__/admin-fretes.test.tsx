// Fretes do admin (card 041). Tela real com a área protegida e a API de mock (MSW).
// "Tentar de novo" está em arquivo próprio: tocar nele deixa o estado do render para o próximo teste.
import { screen, waitFor } from 'expo-router/testing-library';
import { delay, http } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  abrirListaAdmin,
  aguardarSessao,
  caminho,
  gerarFretes,
  responderFretes,
} from '@/test-utils/cenarioListasAdmin';

import { fretesAdminMock } from '../../../mocks/fixtures/admin';
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

async function abrir() {
  await abrirListaAdmin('/admin/fretes');
  await aguardarSessao();
  await screen.findByRole('heading', { name: 'Fretes mais recentes' });
}

describe('Fretes do admin', () => {
  it('um h1, um h2 e um h3 por frete, na ordem da API, com campos em pt-BR', async () => {
    await abrir();

    expect(porNivel(1)).toEqual(['Fretes da plataforma']);
    expect(porNivel(2)).toEqual(['Fretes mais recentes']);
    expect(porNivel(3)).toEqual(fretesAdminMock.map((frete) => frete.tipo_carga));
    expect(screen.getAllByLabelText('Fretes da plataforma')).toHaveLength(1);
    expect(screen.container.queryAll((el) => el.props.role === 'article')).toHaveLength(3);

    // Frete entregue e pago: tudo como a API devolveu.
    expect(screen.getByLabelText('Empresa: Casa Forte Atacado')).toBeOnTheScreen();
    expect(screen.getByLabelText('Motorista: Maria Souza')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Placa: ABC1D23')).toHaveLength(2);
    expect(screen.getByLabelText('Placa: XYZ9K88')).toBeOnTheScreen();
    expect(screen.getByLabelText('Entrega: Entregue')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor do frete: R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão: R$ 175,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão: R$ 160,00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
  });

  it('pagamento e comissão nulos viram texto, nunca travessão', async () => {
    await abrir();

    expect(screen.getByLabelText('Pagamento: Não pago')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão: Ainda não calculada')).toBeOnTheScreen();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('o menu do admin tem Resumo, Fretes e Usuários', async () => {
    await abrir();

    const nomes = ['Resumo', 'Fretes', 'Usuários'];
    for (const nome of nomes) {
      expect(screen.getAllByRole('link', { name: nome }).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getAllByRole('link', { name: 'Fretes' })[0]!.props.href).toBe('/admin/fretes');
  });

  it('não mostra CPF nem CNH mesmo que a API os mande por engano', async () => {
    responderFretes([
      { ...fretesAdminMock[0], cpf: '123.456.789-09', cnh: '98765432100', senha: 'segredo' },
    ]);
    await abrir();

    expect(screen.queryByText(/123\.456\.789-09/)).toBeNull();
    expect(screen.queryByText(/98765432100/)).toBeNull();
    expect(screen.queryByText(/segredo/)).toBeNull();
  });

  it('com 100 fretes avisa "Mostrando os 100 mais recentes."; com menos, não', async () => {
    responderFretes(gerarFretes(100));
    await abrir();

    expect(screen.getByText('Mostrando os 100 mais recentes.')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'article')).toHaveLength(100);
  });

  it('sem fretes: "Nenhum frete ainda" com um caminho de volta', async () => {
    responderFretes([]);
    await abrirListaAdmin('/admin/fretes');
    await aguardarSessao();

    expect(await screen.findByText('Nenhum frete ainda')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Voltar ao resumo' })).toBeOnTheScreen();
    expect(screen.queryByText('Mostrando os 100 mais recentes.')).toBeNull();
  });

  it('enquanto carrega, mostra "Carregando fretes…" numa região de status', async () => {
    servidor.use(http.get(urlMock('/admin/fretes'), () => delay('infinite')));
    await abrirListaAdmin('/admin/fretes');
    await aguardarSessao();

    expect(await screen.findByText('Carregando fretes…')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'article')).toHaveLength(0);
  });

  it('500 mostra "Algo deu errado. Tente de novo." com "Tentar de novo"', async () => {
    servidor.use(http.get(urlMock('/admin/fretes'), () => respostaErro(500, 'erro interno')));
    await abrirListaAdmin('/admin/fretes');
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('403 mostra o texto da API, não o padrão', async () => {
    servidor.use(
      http.get(urlMock('/admin/fretes'), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrirListaAdmin('/admin/fretes');
    await aguardarSessao();

    expect(await screen.findByText('acesso negado para este tipo de usuário')).toBeOnTheScreen();
    expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull();
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('401 apaga o token e leva ao login', async () => {
    servidor.use(http.get(urlMock('/admin/fretes'), () => respostaErro(401, 'token ausente')));
    await abrirListaAdmin('/admin/fretes');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
