// Chat em "Propostas da carga" (card 042, ADR 0016): telas reais, API de mock (MSW). O polling e o
// anúncio com tempo falso estão em propostas-da-carga-chat.polling.test.tsx.
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
import { SessaoContext, type ValorSessao } from '@/state/sessao/SessaoContext';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import { PROPOSTA_ACEITE_ID, PROPOSTA_PENDENTE_ID } from '../../../mocks/fixtures/propostas';
import { usuarioEmpresa } from '../../../mocks/fixtures/usuarios';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import PropostasDaCarga from '../empresa/cargas/detalhe';

jest.mock('@/telas/CorpoPropostasDaCarga.carregar', () => ({
  carregarCorpoPropostasDaCarga: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoPropostasDaCarga')),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };
const SESSAO: ValorSessao = {
  estado: 'autenticado',
  usuario: usuarioEmpresa.usuario,
  aviso: null,
  entrar: jest.fn(async () => undefined),
  sair: jest.fn(async () => undefined),
};

// Maria (aceite pendente, sem mensagens), João (pendente, 3 mensagens) e Carlos (recusada).
const ROTA_MENSAGENS = (id: string) => `/propostas/${id}/mensagens`;

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <PropostasDaCarga />
    </CascaContext.Provider>
  );
}

async function abrir(aoSessaoExpirada = () => undefined) {
  entrarComoMock('mock-empresa', aoSessaoExpirada);
  const cliente = criarClienteDeTeste();
  function Raiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <SessaoContext.Provider value={SESSAO}>
          <QueryClientProvider client={cliente}>
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
  await screen.findByText('Propostas (5)');
  return cliente;
}

const botao = (nome: string) => screen.getByRole('button', { name: nome });
const abrirConversa = async (motorista: string) => {
  await fireEvent.press(botao(`Abrir conversa com ${motorista}`));
};
const campo = () => screen.getByLabelText('Mensagem');
const titulo = (motorista: string) =>
  screen.queryByRole('heading', { name: `Conversa com ${motorista}` });

afterEach(() => {
  sairDoMock();
  servidor.events.removeAllListeners();
});

describe('chat da proposta: abrir e fechar', () => {
  it('cada proposta tem um botão com nome único e aria-expanded; o chat não vem aberto', async () => {
    await abrir();
    expect(screen.getAllByRole('button', { name: /^Abrir conversa com / })).toHaveLength(5);
    const joao = botao('Abrir conversa com João da Silva');
    expect(joao).toBeCollapsed();
    expect(joao.props['aria-controls']).toBe(`conversa-${PROPOSTA_PENDENTE_ID}`);
    expect(screen.queryByLabelText('Mensagem')).toBeNull();
  });

  it('não pede mensagens enquanto nenhuma conversa foi aberta', async () => {
    const lidas = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.includes('/mensagens')) lidas();
    });
    await abrir();
    expect(lidas).not.toHaveBeenCalled();
  });

  it('abrir mostra o histórico em ordem, com "Você" e o nome do motorista, e fechar esconde', async () => {
    await abrir();
    await abrirConversa('João da Silva');

    expect(await screen.findByText('Oi! Você consegue fazer a coleta às 14h?')).toBeOnTheScreen();
    const aberto = botao('Fechar conversa com João da Silva');
    expect(aberto).toBeExpanded();
    expect(titulo('João da Silva')?.props['aria-level']).toBe(4);

    const historico = screen.getByLabelText('Mensagens da conversa com João da Silva');
    const textos = within(historico)
      .getAllByText(/./)
      .map((no) => no.props.children)
      .filter((conteudo) => typeof conteudo === 'string');
    const posicao = (trecho: string) => textos.findIndex((texto) => texto.includes(trecho));
    expect(posicao('coleta às 14h')).toBeLessThan(posicao('Chego na coleta'));
    expect(posicao('Chego na coleta')).toBeLessThan(posicao('portão 2'));
    expect(within(historico).getAllByText('Você')).toHaveLength(2);
    expect(within(historico).getAllByText('João da Silva')).toHaveLength(1);

    await fireEvent.press(aberto);
    expect(titulo('João da Silva')).toBeNull();
    expect(botao('Abrir conversa com João da Silva')).toBeCollapsed();
  });

  it('uma conversa por tela: abrir a segunda fecha a primeira', async () => {
    await abrir();
    await abrirConversa('João da Silva');
    expect(await screen.findByText('Combinado, portão 2.')).toBeOnTheScreen();

    await abrirConversa('Maria Souza');
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
    expect(titulo('João da Silva')).toBeNull();
    expect(titulo('Maria Souza')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Mensagem')).toHaveLength(1);
    expect(botao('Abrir conversa com João da Silva')).toBeCollapsed();
  });

  it('conversa sem mensagens: "Nenhuma mensagem ainda"', async () => {
    await abrir();
    await abrirConversa('Maria Souza');
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
  });
});

describe('chat da proposta: enviar', () => {
  it('201: o campo é limpo e a mensagem aparece depois da releitura', async () => {
    let enviadas: string[] = [];
    servidor.use(
      http.get(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        HttpResponse.json({
          mensagens: enviadas.map((texto, i) => ({
            id: `eeeeeeee-0000-4000-8000-00000000010${i}`,
            remetente_id: usuarioEmpresa.usuario.id,
            texto,
            criado_em: new Date().toISOString(),
          })),
        }),
      ),
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), async ({ request }) => {
        const { texto } = (await request.json()) as { texto: string };
        enviadas = [...enviadas, texto];
        return HttpResponse.json(
          {
            mensagem: {
              id: 'eeeeeeee-0000-4000-8000-000000000100',
              proposta_id: PROPOSTA_PENDENTE_ID,
              remetente_id: usuarioEmpresa.usuario.id,
              texto,
              criado_em: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );
    await abrir();
    await abrirConversa('João da Silva');
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();

    await fireEvent.changeText(campo(), 'Chego às 14h no portão 2');
    await fireEvent.press(botao('Enviar'));

    expect(await screen.findByText('Chego às 14h no portão 2')).toBeOnTheScreen();
    expect(screen.getByText('Você')).toBeOnTheScreen();
    expect(campo().props.value).toBe('');
  });

  it('texto vazio, longo ou com contato é barrado antes do POST, com erro no campo', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await abrirConversa('João da Silva');
    await screen.findByText('Combinado, portão 2.');

    await fireEvent.press(botao('Enviar'));
    expect(screen.getByText('Escreva a mensagem.')).toBeOnTheScreen();

    await fireEvent.changeText(campo(), 'a'.repeat(1001));
    await fireEvent.press(botao('Enviar'));
    expect(screen.getByText('Use no máximo 1000 caracteres.')).toBeOnTheScreen();

    await fireEvent.changeText(campo(), 'Me chama no 34 99999-8888');
    await fireEvent.press(botao('Enviar'));
    const erro = screen.getByText('Não envie telefone, e-mail ou link. Combine tudo por aqui.');
    expect(campo().props['aria-invalid']).toBe(true);
    expect(campo().props['aria-describedby']).toContain(erro.props.nativeID);
    expect(campo().props.value).toBe('Me chama no 34 99999-8888');
    expect(posts).not.toHaveBeenCalled();
  });

  it('400 da API vai para o campo e o texto digitado continua lá', async () => {
    servidor.use(
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        respostaErro(400, 'mensagem não pode conter telefone, e-mail ou link'),
      ),
    );
    await abrir();
    await abrirConversa('João da Silva');
    await screen.findByText('Combinado, portão 2.');

    await fireEvent.changeText(campo(), 'Chego às 14h no portão 2');
    await fireEvent.press(botao('Enviar'));

    expect(
      await screen.findByText('mensagem não pode conter telefone, e-mail ou link'),
    ).toBeOnTheScreen();
    expect(campo().props.value).toBe('Chego às 14h no portão 2');

    // Mexer no texto tira o erro da tentativa anterior.
    await fireEvent.changeText(campo(), 'Chego às 15h');
    expect(screen.queryByText('mensagem não pode conter telefone, e-mail ou link')).toBeNull();
  });

  it('500 no envio: mensagem padrão no campo e o texto continua lá', async () => {
    servidor.use(
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrir();
    await abrirConversa('João da Silva');
    await screen.findByText('Combinado, portão 2.');

    await fireEvent.changeText(campo(), 'Chego às 14h');
    await fireEvent.press(botao('Enviar'));

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(campo().props.value).toBe('Chego às 14h');
    expect(campo().props['aria-invalid']).toBe(true);
  });

  it('409: a conversa passa a encerrada, o histórico fica e o envio é desligado com o motivo', async () => {
    servidor.use(
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        respostaErro(409, 'proposta encerrada: não é possível enviar mensagens'),
      ),
    );
    await abrir();
    await abrirConversa('João da Silva');
    await screen.findByText('Combinado, portão 2.');

    await fireEvent.changeText(campo(), 'Chego às 14h');
    await fireEvent.press(botao('Enviar'));

    expect(
      await screen.findByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Combinado, portão 2.')).toBeOnTheScreen();
    expect(campo().props.editable).toBe(false);
    expect(botao('Enviar')).toBeDisabled();
  });
});

describe('chat da proposta: encerrada e falhas', () => {
  it('proposta recusada: histórico legível e envio desligado, com o motivo em texto', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await abrirConversa('Carlos Lima');

    expect(
      await screen.findByText('Obrigado pela proposta, mas fechamos com outro motorista.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
    ).toBeOnTheScreen();
    expect(campo().props.editable).toBe(false);
    expect(botao('Enviar')).toBeDisabled();
    expect(posts).not.toHaveBeenCalled();
  });

  it('500 ao ler: erro dentro da conversa e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        falhar ? respostaErro(500, 'erro interno') : HttpResponse.json({ mensagens: [] }),
      ),
    );
    await abrir();
    await abrirConversa('João da Silva');
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Mensagem')).toBeNull();

    falhar = false;
    await fireEvent.press(botao('Tentar de novo'));
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
    expect(campo()).toBeOnTheScreen();
  });

  it('404 ao ler (proposta que não é minha): a mensagem da API aparece na conversa', async () => {
    // Ana não está entre os participantes do mock: o GET responde 404.
    await abrir();
    await abrirConversa('Ana Beatriz Rocha');
    expect(await screen.findByText('proposta não encontrada')).toBeOnTheScreen();
    expect(botao('Tentar de novo')).toBeOnTheScreen();
  });

  it('401 ao ler encerra a sessão (CT-04)', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock(ROTA_MENSAGENS(PROPOSTA_ACEITE_ID)), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrir(aoSessaoExpirada);
    await abrirConversa('Maria Souza');
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});
