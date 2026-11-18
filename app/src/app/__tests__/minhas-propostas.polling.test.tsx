// Atualização automática de "Minhas propostas" (ADR 0010, CT-09): com a aba visível, 1 requisição a cada
// 10 s; com a aba oculta por 30 s, nenhuma; uma proposta que muda de status aparece em até 15 s e é
// anunciada uma vez, sem mover o foco. `requisitar` é simulado para o tempo falso controlar tudo.
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import type { MinhaProposta } from '@/api/tipos';
import { CascaContext } from '@/components/organisms/useCasca';
import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { minhasPropostasMock } from '../../../mocks/fixtures/propostas';
import MinhasPropostas from '../motorista/propostas';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoMinhasPropostas.carregar', () => ({
  carregarCorpoMinhasPropostas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoMinhasPropostas')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };
// A primeira proposta do fixture é pendente e tem tipo de carga próprio nos anúncios.
const primeira = minhasPropostasMock[0]!;
const FRETE_NOVO = 'ffffffff-0000-4000-8000-0000000000aa';

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

let propostasDaApi: MinhaProposta[];
let requisicoes: jest.SpyInstance;

const leituras = () =>
  requisicoes.mock.calls.filter(([, caminho]) => caminho === '/propostas/minhas').length;

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
      <MinhasPropostas />
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
    { _layout: Raiz, 'motorista/propostas': Tela },
    { initialUrl: '/motorista/propostas' },
  );
  await avancar(0);
  return consulta;
}

/** A primeira proposta com o status dado: a mudança que a API passa a devolver. */
function comStatus(status: MinhaProposta['status']): MinhaProposta[] {
  return minhasPropostasMock.map((proposta) =>
    proposta.id === primeira.id
      ? { ...proposta, status, frete_id: status === 'aceita' ? FRETE_NOVO : null }
      : proposta,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  propostasDaApi = minhasPropostasMock;
  anunciado.mockClear();
  focoMovido.mockClear();
  // Cada caso abre a tela como "carga inicial" do app: abrir não move o foco (ADR 0009).
  reiniciarCargaInicial();
  requisicoes = jest.spyOn(cliente, 'requisitar').mockImplementation((_metodo, caminho) => {
    if (caminho === '/propostas/minhas') return Promise.resolve({ propostas: propostasDaApi });
    return Promise.reject(new Error(`rota inesperada: ${String(caminho)}`));
  });
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
  requisicoes.mockRestore();
});

describe('minhas propostas do motorista: atualização automática', () => {
  it('com a aba visível, busca as propostas a cada 10 s', async () => {
    const consulta = await abrir();
    expect(screen.getAllByRole('heading', { name: primeira.tipo_carga }).length).toBeGreaterThan(0);
    expect(comPapel('article')).toHaveLength(minhasPropostasMock.length);
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

  it('proposta aceita aparece em até 15 s, é anunciada uma vez e não move o foco', async () => {
    const consulta = await abrir();
    const linkDaPrimeira = `Ver frete de ${primeira.tipo_carga}`;
    expect(screen.queryByRole('link', { name: linkDaPrimeira })).toBeNull();
    expect(anunciado).not.toHaveBeenCalled();

    propostasDaApi = comStatus('aceita');
    await avancar(10_000);

    expect(await screen.findByRole('link', { name: linkDaPrimeira })).toBeOnTheScreen();
    const anuncios = anunciado.mock.calls.map(([texto]) => texto);
    expect(
      anuncios.filter((texto) => texto === `Proposta aceita: ${primeira.tipo_carga}`),
    ).toHaveLength(1);
    expect(focoMovido).not.toHaveBeenCalled();

    // Sem nova mudança, nada mais é anunciado no ciclo seguinte.
    await avancar(10_000);
    expect(
      anunciado.mock.calls.filter(([texto]) => texto.startsWith('Proposta aceita')),
    ).toHaveLength(1);
    consulta.clear();
  });
});
