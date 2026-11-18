// Resumo do admin: se "Atualizar" falha com números já na tela, os números ficam e um aviso de erro
// aparece acima deles, com "Tentar de novo". Não anuncia "Resumo atualizado" numa busca que falhou.
// Arquivo próprio: tocar nos botões deixa o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { delay, http } from 'msw';

import { anunciar } from '@/lib/a11y';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirResumoAdmin,
  aguardarResumo,
  aguardarSessao,
  responderResumo,
} from '@/test-utils/cenarioResumoAdmin';

import { resumoAdminMock } from '../../../mocks/fixtures/admin';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';

jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), anunciar: jest.fn() }));

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
  jest.mocked(anunciar).mockClear();
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-admin');
});

describe('Resumo do admin: falha ao atualizar', () => {
  it('mantém os números, mostra o aviso com "Tentar de novo" e some quando a leitura volta', async () => {
    responderResumo();
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();

    servidor.use(
      http.get(urlMock('/admin/resumo'), async () => {
        await delay(100);
        return respostaErro(500, 'erro interno');
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    // Os números continuam, o botão "Atualizar" também.
    expect(screen.getByRole('heading', { name: 'Pessoas' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Motoristas: 2')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    // Uma busca que falhou não é "Resumo atualizado".
    expect(anunciar).not.toHaveBeenCalledWith('Resumo atualizado');

    const novo = responderResumo({ ...resumoAdminMock, motoristas: 7 }, 100);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(novo.chamadas).toBe(1));
    expect(await screen.findByLabelText('Motoristas: 7')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Algo deu errado. Tente de novo.')).toBeNull());
    await waitFor(() => expect(anunciar).toHaveBeenCalledWith('Resumo atualizado'));
  });
});
