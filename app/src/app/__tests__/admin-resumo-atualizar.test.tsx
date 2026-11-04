// Resumo do admin (ADR 0010): "Atualizar" refaz a leitura; não há atualização automática.
// Arquivo próprio: tocar no botão deixa o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirResumoAdmin,
  aguardarResumo,
  aguardarSessao,
  responderResumo,
} from '@/test-utils/cenarioResumoAdmin';

import { resumoAdminMock } from '../../../mocks/fixtures/admin';

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

describe('Resumo do admin: atualizar', () => {
  it('"Atualizar" refaz a requisição uma vez e traz os números novos', async () => {
    const primeiro = responderResumo();
    await abrirResumoAdmin();
    await aguardarSessao();
    await aguardarResumo();
    expect(primeiro.chamadas).toBe(1);
    expect(screen.getByLabelText('Motoristas: 2')).toBeOnTheScreen();

    const novo = responderResumo({ ...resumoAdminMock, motoristas: 9 });
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => expect(novo.chamadas).toBe(1));
    expect(await screen.findByLabelText('Motoristas: 9')).toBeOnTheScreen();
  });
});
