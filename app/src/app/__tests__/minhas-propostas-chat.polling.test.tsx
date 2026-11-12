// Atualização automática do chat em "Minhas propostas" (ADR 0010 e ADR 0016, card 043): a lista (10 s) e
// a conversa aberta (10 s) atualizam juntas sem tirar o texto digitado; conversa fechada não lê
// mensagens; só a mensagem da empresa é anunciada e o foco nunca se move. `requisitar` é simulado
// para o tempo falso controlar tudo.
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import { CascaContext } from '@/components/organisms/useCasca';
import { reiniciarCargaInicial } from '@/hooks/useFocoNoTitulo';
import { anunciar, moverFoco } from '@/lib/a11y';
import { SessaoContext, type ValorSessao } from '@/state/sessao/SessaoContext';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import {
  minhasPropostasMock,
  PROPOSTA_ACEITE_ID,
  PROPOSTA_PENDENTE_ID,
} from '../../../mocks/fixtures/propostas';
import { EMPRESA_ID_MOCK, usuarioMotorista } from '../../../mocks/fixtures/usuarios';
import MinhasPropostas from '../motorista/propostas';

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
const SESSAO: ValorSessao = {
  estado: 'autenticado',
  usuario: usuarioMotorista.usuario,
  aviso: null,
  entrar: jest.fn(async () => undefined),
  sair: jest.fn(async () => undefined),
};
const EU = usuarioMotorista.usuario.id;
const EMPRESA = 'Transportes Rápidos LTDA';
const PENDENTE = `${EMPRESA} sobre Produtos inflamáveis`;
const ACEITA = `${EMPRESA} sobre Grãos`;

type Mensagem = { id: string; remetente_id: string; texto: string; criado_em: string };
const mensagem = (n: number, remetente_id: string, texto: string): Mensagem => ({
  id: `eeeeeeee-0000-4000-8000-0000000004${String(n).padStart(2, '0')}`,
  remetente_id,
  texto,
  criado_em: '2026-11-04T17:00:00.000Z',
});

const caminhoDasMensagens = (id: string) => `/propostas/${id}/mensagens`;

let mensagens: Record<string, Mensagem[]>;
let requisicoes: jest.SpyInstance;

const leiturasDaLista = () =>
  requisicoes.mock.calls.filter(([, caminho]) => caminho === '/propostas/minhas').length;
const leiturasDasMensagens = (id: string) =>
  requisicoes.mock.calls.filter(([, caminho]) => caminho === caminhoDasMensagens(id)).length;
const leiturasDeMensagens = () =>
  requisicoes.mock.calls.filter(([, caminho]) => String(caminho).endsWith('/mensagens')).length;

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
        <SessaoContext.Provider value={SESSAO}>
          <QueryClientProvider client={consulta}>
            <Slot />
          </QueryClientProvider>
        </SessaoContext.Provider>
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

async function abrirConversa(nome: string) {
  await fireEvent.press(
    screen.getAllByRole('button', { name: new RegExp(`^Abrir conversa com ${nome}`) })[0]!,
  );
  await avancar(0);
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  mensagens = {
    [PROPOSTA_PENDENTE_ID]: [
      mensagem(1, EMPRESA_ID_MOCK, 'Você consegue chegar às 14h?'),
      mensagem(2, EU, 'Consigo, portão 2.'),
    ],
    [PROPOSTA_ACEITE_ID]: [mensagem(3, EMPRESA_ID_MOCK, 'Bom dia.')],
  };
  anunciado.mockClear();
  focoMovido.mockClear();
  reiniciarCargaInicial();
  requisicoes = jest.spyOn(cliente, 'requisitar').mockImplementation((_metodo, caminho) => {
    if (caminho === '/propostas/minhas') return Promise.resolve({ propostas: minhasPropostasMock });
    for (const [id, lista] of Object.entries(mensagens)) {
      if (caminho === caminhoDasMensagens(id)) return Promise.resolve({ mensagens: lista });
    }
    return Promise.reject(new Error(`rota inesperada: ${String(caminho)}`));
  });
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
  requisicoes.mockRestore();
});

describe('chat do motorista: atualização automática', () => {
  it('lista e conversa aberta são lidas a cada 10 s, as duas', async () => {
    const consulta = await abrir();
    await abrirConversa(PENDENTE);
    expect(screen.getByText('Consigo, portão 2.')).toBeOnTheScreen();
    const listaAntes = leiturasDaLista();
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(1);

    await avancar(10_000);
    await avancar(10_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(3);
    expect(leiturasDaLista()).toBe(listaAntes + 2);
    await avancar(9_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(3);
    consulta.clear();
  });

  it('com a conversa fechada não lê nenhuma mensagem, nem depois de 30 s', async () => {
    const consulta = await abrir();
    await avancar(30_000);
    expect(leiturasDeMensagens()).toBe(0);

    await abrirConversa(PENDENTE);
    expect(leiturasDeMensagens()).toBe(1);
    await fireEvent.press(
      screen.getAllByRole('button', { name: new RegExp(`^Fechar conversa com ${PENDENTE}`) })[0]!,
    );
    await avancar(0);
    const depoisDeFechar = leiturasDeMensagens();
    await avancar(30_000);
    expect(leiturasDeMensagens()).toBe(depoisDeFechar);
    consulta.clear();
  });

  it('abrir outra conversa fecha a anterior: só a nova é lida a cada 10 s', async () => {
    const consulta = await abrir();
    await abrirConversa(PENDENTE);
    await abrirConversa(ACEITA);
    expect(screen.getByText('Bom dia.')).toBeOnTheScreen();

    const pendenteAntes = leiturasDasMensagens(PROPOSTA_PENDENTE_ID);
    const aceitaAntes = leiturasDasMensagens(PROPOSTA_ACEITE_ID);
    await avancar(10_000);
    await avancar(10_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(pendenteAntes);
    expect(leiturasDasMensagens(PROPOSTA_ACEITE_ID)).toBe(aceitaAntes + 2);
    consulta.clear();
  });
});

describe('chat do motorista: anúncio e texto digitado', () => {
  it('mensagem nova da empresa aparece, é anunciada uma vez e não move o foco', async () => {
    const consulta = await abrir();
    await abrirConversa(PENDENTE);
    anunciado.mockClear();
    const focoDepoisDeAbrir = focoMovido.mock.calls.length;

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(4, EMPRESA_ID_MOCK, 'Pode vir amanhã cedo.'),
    ];
    await avancar(10_000);

    expect(screen.getByText('Pode vir amanhã cedo.')).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(anunciado).toHaveBeenCalledWith(`1 nova mensagem de ${EMPRESA}`);

    await avancar(10_000);
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(focoMovido.mock.calls.length).toBe(focoDepoisDeAbrir);
    consulta.clear();
  });

  it('as minhas mensagens não são anunciadas', async () => {
    const consulta = await abrir();
    await abrirConversa(PENDENTE);
    anunciado.mockClear();

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(5, EU, 'Combinado.'),
    ];
    await avancar(10_000);

    expect(screen.getByText('Combinado.')).toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalled();
    consulta.clear();
  });

  it('com a lista e a conversa atualizando, o texto digitado e o campo sobrevivem', async () => {
    const consulta = await abrir();
    await abrirConversa(PENDENTE);
    await fireEvent.changeText(screen.getByLabelText('Mensagem'), 'Chego às 14h');
    const focoAntes = focoMovido.mock.calls.length;

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(6, EMPRESA_ID_MOCK, 'Ok, aguardo.'),
    ];
    await avancar(10_000);
    await avancar(10_000);

    expect(screen.getByText('Ok, aguardo.')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Mensagem')).toHaveLength(1);
    expect(screen.getByLabelText('Mensagem').props.value).toBe('Chego às 14h');
    expect(focoMovido.mock.calls.length).toBe(focoAntes);
    consulta.clear();
  });
});
