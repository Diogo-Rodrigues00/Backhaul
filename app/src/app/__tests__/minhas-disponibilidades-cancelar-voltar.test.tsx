// Minhas disponibilidades: "Voltar" no diálogo de cancelar (card 034) fecha sem enviar nada. Arquivo
// próprio: o clique muda o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioMinhasDisponibilidades';
import {
  BOTAO_CANCELAR_ARAGUARI,
  dialogos,
  ROTA_CANCELAR,
} from '@/test-utils/cenarioCancelarDisponibilidade';

import { DISPONIBILIDADE_ABERTA_ANTIGA_ID } from '../../../mocks/fixtures/disponibilidades';
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

describe('Minhas disponibilidades: voltar sem cancelar (card 034)', () => {
  it('"Voltar" fecha o diálogo e não envia o cancelamento', async () => {
    let chamadas = 0;
    servidor.use(
      http.post(urlMock(ROTA_CANCELAR), () => {
        chamadas += 1;
        return HttpResponse.json({
          disponibilidade: { id: DISPONIBILIDADE_ABERTA_ANTIGA_ID, status: 'cancelado' },
        });
      }),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();

    await fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    await waitFor(() => expect(dialogos()).toHaveLength(0));
    expect(chamadas).toBe(0);
    expect(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI })).toBeOnTheScreen();
  });
});
