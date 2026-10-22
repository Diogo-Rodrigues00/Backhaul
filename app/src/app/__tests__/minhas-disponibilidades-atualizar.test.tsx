// Minhas disponibilidades: "Atualizar" refaz a leitura. Sem atualização automática. Arquivo próprio: tocar nos botões deixa o estado do render para o próximo teste.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioMinhasDisponibilidades';

import { disponibilidadesDoMotoristaMock } from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';

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

function contarLeituras() {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/disponibilidades/minhas'), () => {
      contador.chamadas += 1;
      return HttpResponse.json({ disponibilidades: disponibilidadesDoMotoristaMock });
    }),
  );
  return contador;
}

describe('Minhas disponibilidades: atualizar', () => {
  it('"Atualizar" refaz a requisição uma vez; a tela não se atualiza sozinha', async () => {
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    const contador = contarLeituras();
    fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => expect(contador.chamadas).toBe(1));
  });
});
