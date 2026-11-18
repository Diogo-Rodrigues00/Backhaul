// Usuários do admin: bloquear e reativar. Tela real com a área protegida e a API de mock (MSW).
// O clique muda o estado do render para o próximo teste do arquivo: por isso a leitura vem primeiro.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { abrirListaAdmin, aguardarSessao } from '@/test-utils/cenarioListasAdmin';

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

async function abrir() {
  await abrirListaAdmin('/admin/usuarios');
  await aguardarSessao();
  await screen.findByRole('heading', { name: 'Usuários cadastrados' });
}

describe('Usuários do admin: bloquear e reativar', () => {
  it('ativos têm "Bloquear", inativos têm "Reativar" e a conta de admin não tem botão', async () => {
    await abrir();

    expect(screen.getByRole('button', { name: 'Bloquear João da Silva' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Bloquear Transportes Rápidos LTDA' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reativar Maria Souza' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /admin@mock\.test/ })).toBeNull();
  });

  it('bloquear pede confirmação, envia { ativo: false } e fecha o diálogo', async () => {
    let corpoEnviado: unknown;
    servidor.use(
      http.patch(urlMock('/admin/usuarios/:id/ativo'), async ({ request }) => {
        corpoEnviado = await request.json();
        return HttpResponse.json({
          usuario: { id: 'x', email: 'e', tipo: 'motorista', ativo: false },
        });
      }),
    );
    await abrir();

    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear João da Silva' }));
    expect(await screen.findByText('Bloquear este usuário?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear usuário' }));

    await waitFor(() => expect(corpoEnviado).toEqual({ ativo: false }));
    await waitFor(() => expect(screen.queryByText('Bloquear este usuário?')).toBeNull());
  });

  it('erro da API aparece dentro do diálogo, que continua aberto', async () => {
    servidor.use(
      http.patch(urlMock('/admin/usuarios/:id/ativo'), () =>
        respostaErro(409, 'o admin não pode desativar a própria conta'),
      ),
    );
    await abrir();

    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear João da Silva' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Bloquear usuário' }));

    expect(await screen.findByText('o admin não pode desativar a própria conta')).toBeOnTheScreen();
    expect(screen.getByText('Bloquear este usuário?')).toBeOnTheScreen();
  });
});
