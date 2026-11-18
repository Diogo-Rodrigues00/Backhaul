// Atualização automática e anúncio do chat em "Propostas da carga" (ADR 0010 e ADR 0016, card 042):
// com a conversa aberta e a aba visível, 1 leitura de mensagens a cada 10 s; conversa fechada ou aba
// oculta, nenhuma; só a mensagem da outra parte é anunciada e o foco nunca se move. `requisitar` é
// simulado para o tempo falso controlar tudo sem depender de I/O real.
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { criarQueryClient } from '@/api/consulta';
import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar, moverFoco } from '@/lib/a11y';
import { SessaoContext, type ValorSessao } from '@/state/sessao/SessaoContext';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { cargasDaEmpresaMock, CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import {
  PROPOSTA_ACEITE_ID,
  PROPOSTA_PENDENTE_ID,
  propostasDaCargaMock,
} from '../../../mocks/fixtures/propostas';
import { MOTORISTA_JOAO_ID, usuarioEmpresa } from '../../../mocks/fixtures/usuarios';
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
const SESSAO: ValorSessao = {
  estado: 'autenticado',
  usuario: usuarioEmpresa.usuario,
  aviso: null,
  entrar: jest.fn(async () => undefined),
  sair: jest.fn(async () => undefined),
};
const EU = usuarioEmpresa.usuario.id;

type Mensagem = { id: string; remetente_id: string; texto: string; criado_em: string };
const mensagem = (n: number, remetente_id: string, texto: string): Mensagem => ({
  id: `eeeeeeee-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`,
  remetente_id,
  texto,
  criado_em: '2026-11-04T17:00:00.000Z',
});

const caminhoDasPropostas = `/cargas/${CARGA_URGENTE_ID}/propostas`;
const caminhoDasMensagens = (id: string) => `/propostas/${id}/mensagens`;

let mensagens: Record<string, Mensagem[]>;
let requisicoes: jest.SpyInstance;

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
      <PropostasDaCarga />
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
    { _layout: Raiz, 'empresa/cargas/detalhe': Tela },
    { initialUrl: `/empresa/cargas/detalhe?id=${CARGA_URGENTE_ID}` },
  );
  await avancar(0);
  return consulta;
}

async function abrirConversa(motorista: string) {
  await fireEvent.press(screen.getByRole('button', { name: `Abrir conversa com ${motorista}` }));
  await avancar(0);
}

beforeEach(() => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  mensagens = {
    [PROPOSTA_PENDENTE_ID]: [
      mensagem(1, EU, 'Você consegue chegar às 14h?'),
      mensagem(2, MOTORISTA_JOAO_ID, 'Consigo, portão 2.'),
    ],
    [PROPOSTA_ACEITE_ID]: [mensagem(3, MOTORISTA_JOAO_ID, 'Bom dia.')],
  };
  anunciado.mockClear();
  focoMovido.mockClear();
  requisicoes = jest.spyOn(cliente, 'requisitar').mockImplementation((_metodo, caminho) => {
    if (caminho === '/cargas/minhas') return Promise.resolve({ cargas: cargasDaEmpresaMock });
    if (caminho === caminhoDasPropostas) {
      return Promise.resolve({ propostas: propostasDaCargaMock });
    }
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

describe('chat da proposta: atualização automática', () => {
  it('com a conversa aberta e a aba visível, lê as mensagens a cada 10 s', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');
    expect(screen.getByText('Consigo, portão 2.')).toBeOnTheScreen();
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(1);

    await avancar(10_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(2);
    await avancar(10_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(3);
    await avancar(9_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(3);
    consulta.clear();
  });

  it('com a conversa fechada não lê nenhuma mensagem, nem depois de 30 s', async () => {
    const consulta = await abrir();
    await avancar(30_000);
    expect(leiturasDeMensagens()).toBe(0);

    await abrirConversa('João da Silva');
    expect(leiturasDeMensagens()).toBe(1);
    // Fechar desmonta o observador: o intervalo para.
    await fireEvent.press(
      screen.getByRole('button', { name: 'Fechar conversa com João da Silva' }),
    );
    await avancar(0);
    const depoisDeFechar = leiturasDeMensagens();
    await avancar(30_000);
    expect(leiturasDeMensagens()).toBe(depoisDeFechar);
    consulta.clear();
  });

  it('com a aba oculta por 30 s não faz nenhuma requisição, e volta ao recuperar o foco', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');
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
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBeGreaterThanOrEqual(2);
    consulta.clear();
  });

  it('abrir outra conversa fecha a anterior: só a nova é lida a cada 10 s', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');
    await abrirConversa('Maria Souza');
    expect(screen.getByText('Bom dia.')).toBeOnTheScreen();

    const joaoAntes = leiturasDasMensagens(PROPOSTA_PENDENTE_ID);
    const mariaAntes = leiturasDasMensagens(PROPOSTA_ACEITE_ID);
    await avancar(10_000);
    await avancar(10_000);
    expect(leiturasDasMensagens(PROPOSTA_PENDENTE_ID)).toBe(joaoAntes);
    expect(leiturasDasMensagens(PROPOSTA_ACEITE_ID)).toBe(mariaAntes + 2);
    consulta.clear();
  });
});

describe('chat da proposta: anúncio', () => {
  it('mensagem nova da outra parte aparece em até 15 s, é anunciada uma vez e não move o foco', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');
    expect(anunciado).not.toHaveBeenCalled();
    const focoDepoisDeAbrir = focoMovido.mock.calls.length;

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(4, MOTORISTA_JOAO_ID, 'Cheguei no portão.'),
    ];
    await avancar(10_000);

    expect(screen.getByText('Cheguei no portão.')).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(anunciado).toHaveBeenCalledWith('1 nova mensagem de João da Silva');

    // Mais um ciclo sem mudança: nada novo a anunciar e o foco continua onde estava.
    await avancar(10_000);
    expect(anunciado).toHaveBeenCalledTimes(1);
    expect(focoMovido.mock.calls.length).toBe(focoDepoisDeAbrir);
    consulta.clear();
  });

  it('as minhas mensagens não são anunciadas', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(5, EU, 'Combinado.'),
    ];
    await avancar(10_000);

    expect(screen.getByText('Combinado.')).toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalled();
    consulta.clear();
  });

  it('o que a pessoa está digitando sobrevive às atualizações', async () => {
    const consulta = await abrir();
    await abrirConversa('João da Silva');
    await fireEvent.changeText(screen.getByLabelText('Mensagem'), 'Chego às 14h');

    mensagens[PROPOSTA_PENDENTE_ID] = [
      ...(mensagens[PROPOSTA_PENDENTE_ID] ?? []),
      mensagem(6, MOTORISTA_JOAO_ID, 'Cheguei.'),
    ];
    await avancar(10_000);

    expect(screen.getByText('Cheguei.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mensagem').props.value).toBe('Chego às 14h');
    consulta.clear();
  });
});
