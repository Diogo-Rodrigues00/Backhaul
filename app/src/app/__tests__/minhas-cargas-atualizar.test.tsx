// Minhas cargas (Q5, ADR 0010): "Atualizar" refaz a leitura; não há atualização automática.
// Arquivo próprio: tocar no botão deixa o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasCargas,
  aguardarLista,
  aguardarSessao,
  contarLeituras,
} from '@/test-utils/cenarioMinhasCargas';

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

describe('Minhas cargas: atualizar', () => {
  it('"Atualizar" refaz a requisição uma vez; a tela não se atualiza sozinha', async () => {
    await abrirMinhasCargas();
    await aguardarSessao();
    await aguardarLista();

    const contador = contarLeituras();
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => expect(contador.chamadas).toBe(1));
  });
});
