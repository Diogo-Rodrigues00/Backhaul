// Minhas propostas do motorista (card 026, MVP-15): tela real, API de mock (MSW) no formato real de
// GET /propostas/minhas. A atualização automática com tempo falso está em minhas-propostas.polling.test.tsx.
// Atenção ao fixture: duas propostas dividem o mesmo tipo de carga, então os cartões são lidos por posição.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import {
  configure,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { CascaContext } from '@/components/organisms/useCasca';
import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { anunciar, moverFoco } from '@/lib/a11y';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { minhasPropostasMock } from '../../../mocks/fixtures/propostas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
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

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = anunciar as jest.MockedFunction<typeof anunciar>;
const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <MinhasPropostas />
    </CascaContext.Provider>
  );
}

async function abrir(aoSessaoExpirada = () => undefined) {
  entrarComoMock('mock-motorista', aoSessaoExpirada);
  const cliente = criarClienteDeTeste();
  function Raiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <Slot />
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    { _layout: Raiz, 'motorista/propostas': Tela },
    { initialUrl: '/motorista/propostas' },
  );
  return cliente;
}

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

/** Espera a lista chegar e devolve os títulos (h2) dos cartões, na ordem da tela. */
async function esperarCartoes() {
  let titulos: ReturnType<typeof screen.getAllByRole> = [];
  await waitFor(() => {
    titulos = screen.getAllByRole('heading').filter((h) => h.props['aria-level'] === 2);
    expect(titulos).toHaveLength(minhasPropostasMock.length);
  });
  return titulos;
}

const primeira = minhasPropostasMock[0]!;

beforeEach(() => {
  anunciado.mockClear();
  focoMovido.mockClear();
  // Cada caso abre a tela como "carga inicial" do app: abrir não move o foco (ADR 0009).
  reiniciarCargaInicial();
});

afterEach(() => sairDoMock());

describe('minhas propostas do motorista: leitura (MVP-15)', () => {
  it('h1 "Minhas propostas" e uma lista com um cartão por proposta, na ordem da API', async () => {
    await abrir();
    const titulos = await esperarCartoes();
    expect(screen.getByRole('heading', { name: 'Minhas propostas' }).props['aria-level']).toBe(1);

    const lista = comPapel('list').find((el) => el.props['aria-label'] === 'Propostas');
    expect(lista).toBeDefined();
    expect(comPapel('article')).toHaveLength(minhasPropostasMock.length);
    expect(titulos[0]).toHaveTextContent(primeira.tipo_carga);
  });

  it('cada cartão mostra empresa, tipo, status em texto e os valores', async () => {
    await abrir();
    await esperarCartoes();
    expect(screen.getAllByText(`Empresa: ${primeira.empresa}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recusada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expirada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aceita').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Valor oferecido pela empresa')).toHaveLength(
      minhasPropostasMock.length,
    );
  });

  it('proposta aceita com frete tem "Ver frete" para Meus fretes; as outras não', async () => {
    await abrir();
    await esperarCartoes();
    const comFrete = minhasPropostasMock.filter(
      (p) => p.status === 'aceita' && p.frete_id !== null,
    );
    const links = screen.getAllByRole('link', { name: /Ver frete/ });
    expect(links).toHaveLength(comFrete.length);
    for (const proposta of comFrete) {
      const link = screen.getByRole('link', { name: `Ver frete de ${proposta.tipo_carga}` });
      expect(link.props.href).toBe('/motorista/fretes');
    }
  });

  it('a legenda de atualização automática e o botão Atualizar aparecem com a tela aberta', async () => {
    await abrir();
    await esperarCartoes();
    expect(screen.getByText(/Esta tela atualiza sozinha a cada 10 s/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
  });

  it('CT-02: sem propostas mostra "Você ainda não fez propostas" e "Ver cargas próximas"', async () => {
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () => HttpResponse.json({ propostas: [] })),
    );
    await abrir();

    expect(await screen.findByText('Você ainda não fez propostas')).toBeOnTheScreen();
    const [link] = screen.getAllByRole('link', { name: 'Ver cargas próximas' });
    expect(link?.props.href).toBe('/motorista/cargas');
  });

  it('enquanto carrega, mostra "Carregando suas propostas…"', async () => {
    servidor.use(
      http.get(urlMock('/propostas/minhas'), async () => {
        await new Promise((resolver) => setTimeout(resolver, 300));
        return HttpResponse.json({ propostas: minhasPropostasMock });
      }),
    );
    await abrir();
    expect(screen.getByText('Carregando suas propostas…')).toBeOnTheScreen();
    await esperarCartoes();
  });

  it('falha 500 mostra a mensagem padrão e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () =>
        falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json({ propostas: minhasPropostasMock }),
      ),
    );
    await abrir();
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await esperarCartoes();
  });

  it('404 de perfil mostra a mensagem da API', async () => {
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () =>
        respostaErro(404, 'perfil de motorista não encontrado'),
      ),
    );
    await abrir();
    expect(await screen.findByText('perfil de motorista não encontrado')).toBeOnTheScreen();
  });

  it('CT-04: 401 chama o encerramento da sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () => respostaErro(401, 'token inválido ou expirado')),
    );
    await abrir(aoSessaoExpirada);
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });

  it('a lista está dentro da região principal, e abrir a tela não anuncia nem move o foco', async () => {
    await abrir();
    await esperarCartoes();
    const [principal] = comPapel('main');
    expect(principal).toBeDefined();
    expect(within(principal!).getByRole('heading', { name: 'Minhas propostas' })).toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalled();
    expect(focoMovido).not.toHaveBeenCalled();
  });
});
