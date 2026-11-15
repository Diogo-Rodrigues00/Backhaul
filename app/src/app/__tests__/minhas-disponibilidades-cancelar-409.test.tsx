// Minhas disponibilidades: cancelar com 409 (card 034): o diálogo fecha, o aviso traz a mensagem da API e a
// lista é relida. Arquivo próprio: o clique em "Cancelar" muda o estado do render para o próximo teste.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirMinhasDisponibilidades,
  aguardarLista,
  aguardarSessao,
  textoDaAtiva,
} from '@/test-utils/cenarioMinhasDisponibilidades';
import {
  alertas,
  BOTAO_CANCELAR_ARAGUARI,
  dialogos,
  ROTA_CANCELAR,
  ROTA_MINHAS,
  TEXTO_ATIVA_UBERLANDIA,
} from '@/test-utils/cenarioCancelarDisponibilidade';

import { disponibilidadesDoMotoristaMock } from '../../../mocks/fixtures/disponibilidades';
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
  await apagar(CHAVES.disponibilidadeAtiva);
  await gravar(CHAVES.token, 'mock-motorista');
});

describe('Minhas disponibilidades: cancelar com 409 (card 034)', () => {
  it('o diálogo fecha, o aviso traz a mensagem da API e a lista é relida', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock(ROTA_MINHAS), () => {
        leituras += 1;
        return HttpResponse.json({ disponibilidades: disponibilidadesDoMotoristaMock });
      }),
      http.post(urlMock(ROTA_CANCELAR), () =>
        respostaErro(409, 'disponibilidade não está mais aberta'),
      ),
    );
    await abrirMinhasDisponibilidades();
    await aguardarSessao();
    await aguardarLista();
    const leiturasAntes = leituras;

    fireEvent.press(screen.getByRole('button', { name: BOTAO_CANCELAR_ARAGUARI }));
    await waitFor(() => expect(dialogos()).toHaveLength(1));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar disponibilidade' }));

    expect(await screen.findByText('disponibilidade não está mais aberta')).toBeOnTheScreen();
    expect(screen.getByText('Não foi possível cancelar.')).toBeOnTheScreen();
    expect(alertas().length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    await waitFor(() => expect(leituras).toBeGreaterThan(leiturasAntes));
    expect(textoDaAtiva()).toBe(TEXTO_ATIVA_UBERLANDIA);
  });
});
