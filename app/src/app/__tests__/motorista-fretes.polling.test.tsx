// Atualização automática dos fretes do motorista (ADR 0010, CT-09): com foco, 1 requisição a cada
// 10 s; com a aba oculta por 30 s, nenhuma; o pagamento feito pela empresa aparece em até 15 s e é
// anunciado só na mudança, sem mover o foco. `requisitar` é simulado para o tempo falso controlar
// tudo sem depender de I/O real.
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import type { FreteDoMotorista } from '@/api/tipos';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { fretesDoMotoristaMock } from '../../../mocks/fixtures/fretes';
import MeusFretes from '../motorista/fretes';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoMeusFretesMotorista.carregar', () => ({
  carregarCorpoMeusFretesMotorista: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoMeusFretesMotorista')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

let fretesDaApi: FreteDoMotorista[];
let requisicoes: jest.SpyInstance;

const leituras = () =>
  requisicoes.mock.calls.filter(([, caminho]) => caminho === '/fretes/meus').length;

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
      <MeusFretes />
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
    { _layout: Raiz, 'motorista/fretes': Tela },
    { initialUrl: '/motorista/fretes' },
  );
  await avancar(0);
  return consulta;
}

/** O frete "Produtos inflamáveis" (aceito, sem pagamento) com a situação de pagamento dada. */
function comPagamento(status: FreteDoMotorista['status_pagamento']): FreteDoMotorista[] {
  return fretesDoMotoristaMock.map((frete) =>
    frete.id === fretesDoMotoristaMock[0]!.id ? { ...frete, status_pagamento: status } : frete,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  fretesDaApi = fretesDoMotoristaMock;
  anunciado.mockClear();
  focoMovido.mockClear();
  requisicoes = jest.spyOn(cliente, 'requisitar').mockImplementation((_metodo, caminho) => {
    if (caminho === '/fretes/meus') return Promise.resolve({ fretes: fretesDaApi });
    return Promise.reject(new Error(`rota inesperada: ${String(caminho)}`));
  });
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
  requisicoes.mockRestore();
});

describe('meus fretes do motorista: atualização automática', () => {
  it('com a aba visível, busca os fretes a cada 10 s', async () => {
    const consulta = await abrir();
    expect(screen.getAllByRole('heading', { name: 'Grãos' }).length).toBeGreaterThan(0);
    expect(leituras()).toBe(1);

    await avancar(10_000);
    expect(leituras()).toBe(2);
    await avancar(10_000);
    expect(leituras()).toBe(3);
    await avancar(9_000);
    expect(leituras()).toBe(3);
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
    expect(leituras()).toBeGreaterThanOrEqual(2);
    consulta.clear();
  });

  it('pagamento feito pela empresa aparece em até 15 s, é anunciado uma vez e não move o foco', async () => {
    const consulta = await abrir();
    expect(screen.getByText('Aguardando pagamento')).toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalled();

    fretesDaApi = comPagamento('retido');
    await avancar(10_000);

    expect(screen.queryByText('Aguardando pagamento')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Pago, retido até a entrega')).toHaveLength(2);
    const frase = 'Pagamento recebido: Produtos inflamáveis (retido até a entrega)';
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(anunciado).toHaveBeenCalledWith(frase);
    // A barra de novidades mostra a mesma frase.
    expect(screen.getAllByText(frase).length).toBeGreaterThan(0);

    // Mais ciclos sem mudança: nada novo a anunciar e o foco não se mexe.
    const depoisDoPagamento = focoMovido.mock.calls.length;
    await avancar(20_000);
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(focoMovido.mock.calls.length).toBe(depoisDoPagamento);
    consulta.clear();
  });

  it('pagamento liberado depois da entrega também é anunciado', async () => {
    fretesDaApi = fretesDoMotoristaMock.map((frete) =>
      frete.status_entrega === 'entregue' ? { ...frete, status_pagamento: null } : frete,
    );
    const consulta = await abrir();

    fretesDaApi = fretesDoMotoristaMock;
    await avancar(10_000);

    expect(anunciado).toHaveBeenCalledWith('Pagamento liberado: Material de construção');
    consulta.clear();
  });

  it('o diálogo aberto sobrevive às atualizações (a lista não é remontada)', async () => {
    const consulta = await abrir();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar transporte de Produtos inflamáveis' }),
    );
    expect(screen.getByText('Iniciar o transporte de Produtos inflamáveis?')).toBeOnTheScreen();

    fretesDaApi = comPagamento('retido');
    await avancar(10_000);

    expect(screen.getAllByText('Pago, retido até a entrega')).toHaveLength(2);
    expect(screen.getByText('Iniciar o transporte de Produtos inflamáveis?')).toBeOnTheScreen();
    consulta.clear();
  });
});
