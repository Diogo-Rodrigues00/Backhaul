// Atualização automática das propostas da carga (ADR 0010, CT-09): com foco, 1 requisição a cada
// 10 s; com a aba oculta por 30 s, nenhuma; a novidade é anunciada só na mudança, sem mover o foco.
// `requisitar` é simulado para o tempo falso controlar tudo sem depender de I/O real.
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { cargasDaEmpresaMock, CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import { propostasDaCargaMock } from '../../../mocks/fixtures/propostas';
import PropostasDaCarga from '../empresa/cargas/detalhe';

jest.mock('@/telas/CorpoPropostasDaCarga.carregar', () => ({
  carregarCorpoPropostasDaCarga: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoPropostasDaCarga')),
}));

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };
const caminhoDasPropostas = `/cargas/${CARGA_URGENTE_ID}/propostas`;

let quantasPropostas: number;
let requisicoes: jest.SpyInstance;

const leiturasDasPropostas = () =>
  requisicoes.mock.calls.filter(([, caminho]) => caminho === caminhoDasPropostas).length;

async function avancar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  // O TanStack notifica os observadores num timer de 0 ms depois de a busca terminar.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1);
  });
}

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <PropostasDaCarga />
    </CascaContext.Provider>
  );
}

async function abrir() {
  const consulta = criarQueryClient();
  function Raiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={consulta}>
          <Slot />
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    { _layout: Raiz, 'empresa/cargas/detalhe': Tela },
    { initialUrl: `/empresa/cargas/detalhe?id=${CARGA_URGENTE_ID}` },
  );
  await avancar(0);
  return consulta;
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  quantasPropostas = 4;
  anunciado.mockClear();
  focoMovido.mockClear();
  requisicoes = jest.spyOn(cliente, 'requisitar').mockImplementation((_metodo, caminho) => {
    if (caminho === '/cargas/minhas') return Promise.resolve({ cargas: cargasDaEmpresaMock });
    if (caminho === caminhoDasPropostas) {
      return Promise.resolve({ propostas: propostasDaCargaMock.slice(0, quantasPropostas) });
    }
    return Promise.reject(new Error(`rota inesperada: ${String(caminho)}`));
  });
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
  requisicoes.mockRestore();
});

describe('propostas da carga: atualização automática', () => {
  it('com a aba visível, busca as propostas a cada 10 s', async () => {
    const consulta = await abrir();
    expect(screen.getByText('Propostas (4)')).toBeOnTheScreen();
    expect(leiturasDasPropostas()).toBe(1);

    await avancar(10_000);
    expect(leiturasDasPropostas()).toBe(2);
    await avancar(10_000);
    expect(leiturasDasPropostas()).toBe(3);
    await avancar(9_000);
    expect(leiturasDasPropostas()).toBe(3);
    consulta.clear();
  });

  it('com a aba oculta por 30 s não faz nenhuma requisição, e volta ao recuperar o foco', async () => {
    const consulta = await abrir();
    const antes = requisicoes.mock.calls.length;

    await act(async () => {
      focusManager.setFocused(false);
    });
    await avancar(30_000);
    expect(requisicoes.mock.calls.length).toBe(antes);

    await act(async () => {
      focusManager.setFocused(true);
    });
    await avancar(0);
    expect(leiturasDasPropostas()).toBeGreaterThanOrEqual(2);
    consulta.clear();
  });

  it('proposta nova aparece em até 15 s, é anunciada uma vez e não move o foco', async () => {
    const consulta = await abrir();
    expect(anunciado).not.toHaveBeenCalled();

    quantasPropostas = 5;
    await avancar(10_000);

    expect(screen.getByText('Propostas (5)')).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(anunciado).toHaveBeenCalledWith('1 nova proposta');
    expect(screen.getAllByText('Nova')).toHaveLength(1);
    expect(screen.getAllByText('1 nova proposta').length).toBeGreaterThan(0);

    // Mais um ciclo sem mudança: nada novo a anunciar.
    await avancar(10_000);
    expect(anunciado).toHaveBeenCalledTimes(1);
    // Só a mudança de rota (h1) mexe no foco; o polling nunca chama moverFoco.
    const depoisDoPolling = focoMovido.mock.calls.length;
    await avancar(10_000);
    expect(focoMovido.mock.calls.length).toBe(depoisDoPolling);
    consulta.clear();
  });

  it('o diálogo aberto sobrevive às atualizações (a lista não é remontada)', async () => {
    const consulta = await abrir();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aceitar proposta de João da Silva' }),
    );
    expect(screen.getByText('Aceitar a proposta de João da Silva?')).toBeOnTheScreen();

    quantasPropostas = 5;
    await avancar(10_000);

    expect(screen.getByText('Propostas (5)')).toBeOnTheScreen();
    expect(screen.getByText('Aceitar a proposta de João da Silva?')).toBeOnTheScreen();
    consulta.clear();
  });
});
