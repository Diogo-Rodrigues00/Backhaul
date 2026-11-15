// Minhas disponibilidades: cancelar no plano B, com `GET /disponibilidades/minhas` ausente (card 034).
// Arquivo próprio: o clique em "Cancelar" muda o estado do render para o próximo teste do arquivo.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { serializarEscolha } from '@/lib/disponibilidadeAtiva';
import {
  abrirMinhasDisponibilidades,
  aguardarSessao,
  textoDaAtiva,
} from '@/test-utils/cenarioMinhasDisponibilidades';
import {
  BOTAO_CANCELAR_UBERLANDIA,
  dialogos,
  ROTA_CANCELAR,
  ROTA_MINHAS,
} from '@/test-utils/cenarioCancelarDisponibilidade';

import { disponibilidadePublicadaMock } from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaHtml } from '../../../mocks/respostas';

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

describe('Minhas disponibilidades: cancelar no plano B (card 034)', () => {
  it('apaga a cópia guardada no aparelho e a ativa vai a nenhuma', async () => {
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () => respostaHtml(404)),
      http.post(urlMock(ROTA_CANCELAR), () =>
        HttpResponse.json({
          disponibilidade: { id: disponibilidadePublicadaMock.id, status: 'cancelado' },
        }),
      ),
    );
    await gravar(
      CHAVES.disponibilidadeAtiva,
      serializarEscolha({
        id: disponibilidadePublicadaMock.id,
        publicada: disponibilidadePublicadaMock,
      }),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await waitFor(() =>
      expect(textoDaAtiva()).toBe(
        `${disponibilidadePublicadaMock.id}|-18.9186|-48.2772|80|urgente`,
      ),
    );

    fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_UBERLANDIA }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Nenhuma disponibilidade publicada' }),
      ).toBeOnTheScreen(),
    );
    expect(textoDaAtiva()).toBe('nenhuma');
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
    expect(screen.getByText('Disponibilidade cancelada.')).toBeOnTheScreen();
  });
});
