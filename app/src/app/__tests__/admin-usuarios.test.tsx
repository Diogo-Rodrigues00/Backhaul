// Usuários do admin (card 041). Tela real com a área protegida e a API de mock (MSW).
import { screen, waitFor } from 'expo-router/testing-library';
import { delay, http } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  abrirListaAdmin,
  aguardarSessao,
  caminho,
  gerarUsuarios,
  responderUsuarios,
} from '@/test-utils/cenarioListasAdmin';

import { usuariosAdminMock } from '../../../mocks/fixtures/admin';
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
  await abrirListaAdmin('/admin/usuarios');
  await aguardarSessao();
  await screen.findByRole('heading', { name: 'Usuários cadastrados' });
}

describe('Usuários do admin', () => {
  it('um h1, um h2 e um h3 por usuário (nome, ou e-mail no admin), na ordem da API', async () => {
    await abrir();

    expect(porNivel(1)).toEqual(['Usuários da plataforma']);
    expect(porNivel(2)).toEqual(['Usuários cadastrados']);
    // O admin vem com `nome: null`: o título é o e-mail.
    expect(porNivel(3)).toEqual([
      'admin@mock.test',
      'Transportes Rápidos LTDA',
      'João da Silva',
      'Maria Souza',
    ]);
    expect(screen.getAllByLabelText('Usuários da plataforma')).toHaveLength(1);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('perfil e situação em texto, sem documento nenhum', async () => {
    await abrir();

    expect(screen.getByLabelText('Perfil: Administrador')).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil: Empresa')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Perfil: Motorista')).toHaveLength(2);
    expect(screen.getAllByLabelText('Situação: Ativo')).toHaveLength(3);
    expect(screen.getByLabelText('Situação: Inativo')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail: maria@mock.test')).toBeOnTheScreen();
    expect(screen.queryByText(/CPF|CNPJ|CNH|senha/i)).toBeNull();
  });

  it('descarta CPF, CNPJ e senha mesmo que a API os mande por engano', async () => {
    responderUsuarios([
      { ...usuariosAdminMock[2], cpf: '123.456.789-09', cnh: '98765432100', senha_hash: 'abc123' },
    ]);
    await abrir();

    expect(screen.queryByText(/123\.456\.789-09/)).toBeNull();
    expect(screen.queryByText(/98765432100/)).toBeNull();
    expect(screen.queryByText(/abc123/)).toBeNull();
  });

  it('com 200 usuários avisa "Mostrando os 200 mais recentes."', async () => {
    responderUsuarios(gerarUsuarios(200));
    await abrir();

    expect(screen.getByText('Mostrando os 200 mais recentes.')).toBeOnTheScreen();
  });

  it('sem usuários: "Nenhum usuário cadastrado"', async () => {
    responderUsuarios([]);
    await abrirListaAdmin('/admin/usuarios');
    await aguardarSessao();

    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Voltar ao resumo' })).toBeOnTheScreen();
  });

  it('enquanto carrega, mostra "Carregando usuários…"', async () => {
    servidor.use(http.get(urlMock('/admin/usuarios'), () => delay('infinite')));
    await abrirListaAdmin('/admin/usuarios');
    await aguardarSessao();

    expect(await screen.findByText('Carregando usuários…')).toBeOnTheScreen();
    expect(screen.container.queryAll((el) => el.props.role === 'article')).toHaveLength(0);
  });

  it('500 mostra "Algo deu errado. Tente de novo." com "Tentar de novo"', async () => {
    servidor.use(http.get(urlMock('/admin/usuarios'), () => respostaErro(500, 'erro interno')));
    await abrirListaAdmin('/admin/usuarios');
    await aguardarSessao();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('401 apaga o token e leva ao login', async () => {
    servidor.use(http.get(urlMock('/admin/usuarios'), () => respostaErro(401, 'token ausente')));
    await abrirListaAdmin('/admin/usuarios');

    await waitFor(() => expect(caminho()).toBe('/entrar'));
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
