// Chat em "Minhas propostas" (card 043, ADR 0016): tela real do motorista, API de mock (MSW). O polling
// e o anúncio com tempo falso estão em minhas-propostas-chat.polling.test.tsx.
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

import {
  minhasPropostasMock,
  PROPOSTA_ACEITE_ID,
  PROPOSTA_PENDENTE_ID,
} from '../../../mocks/fixtures/propostas';
import { usuarioMotorista } from '../../../mocks/fixtures/usuarios';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import MinhasPropostas from '../motorista/propostas';

jest.mock('@/telas/CorpoMinhasPropostas.carregar', () => ({
  carregarCorpoMinhasPropostas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoMinhasPropostas')),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };
const SESSAO: ValorSessao = {
  estado: 'autenticado',
  usuario: usuarioMotorista.usuario,
  aviso: null,
  entrar: jest.fn(async () => undefined),
  sair: jest.fn(async () => undefined),
};

const EMPRESA = 'Transportes Rápidos LTDA';
// Nomes dos botões (empresa + carga), únicos nos casos abaixo.
const PENDENTE = `${EMPRESA} sobre Produtos inflamáveis`;
const ACEITA = `${EMPRESA} sobre Grãos`;
const RECUSADA = 'Agro Cerrado Grãos S.A. sobre Grãos a granel';
const EXPIRADA = 'Distribuidora Casa Forte sobre Material de construção';
const ROTA_MENSAGENS = (id: string) => `/propostas/${id}/mensagens`;

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <MinhasPropostas />
    </CascaContext.Provider>
  );
}

async function abrir() {
  entrarComoMock('mock-motorista');
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
    { _layout: Raiz, 'motorista/propostas': Tela },
    { initialUrl: '/motorista/propostas' },
  );
  await waitFor(() =>
    expect(screen.getAllByRole('button', { name: /^Abrir conversa com / })).toHaveLength(
      minhasPropostasMock.length,
    ),
  );
  return cliente;
}

// A 1ª e a 3ª proposta do fixture (026) dividem empresa e tipo de carga, então o nome do botão se
// repete: o primeiro é o da proposta pendente do João, a que os casos abaixo usam.
// O nome acessível termina com ", enviada em <data>" (único por proposta): o teste casa o começo.
const comecaCom = (texto: string) => new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
const botao = (nome: string) => screen.getAllByRole('button', { name: comecaCom(nome) })[0]!;
const abrirConversa = async (nome: string) => {
  await fireEvent.press(botao(`Abrir conversa com ${nome}`));
};
const campo = () => screen.getByLabelText('Mensagem');
const titulo = (empresa: string) =>
  screen.queryByRole('heading', { name: `Conversa com ${empresa}` });

afterEach(() => {
  sairDoMock();
  servidor.events.removeAllListeners();
});

describe('chat da proposta do motorista: abrir e fechar', () => {
  it('cada proposta tem um botão com empresa e carga no nome e aria-expanded; o chat não vem aberto', async () => {
    await abrir();
    const pendente = botao(`Abrir conversa com ${PENDENTE}`);
    expect(pendente).toBeCollapsed();
    expect(pendente.props['aria-controls']).toBe(`conversa-${PROPOSTA_PENDENTE_ID}`);
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

  it('abrir mostra o histórico em ordem, com "Você" e o nome da empresa, e fechar esconde', async () => {
    await abrir();
    await abrirConversa(PENDENTE);

    expect(await screen.findByText('Oi! Você consegue fazer a coleta às 14h?')).toBeOnTheScreen();
    const aberto = botao(`Fechar conversa com ${PENDENTE}`);
    expect(aberto).toBeExpanded();
    expect(titulo(EMPRESA)?.props['aria-level']).toBe(4);

    const historico = screen.getByLabelText(`Mensagens da conversa com ${EMPRESA}`);
    // No mock, a empresa escreve 2 vezes e o motorista (eu) 1.
    expect(within(historico).getAllByText('Você')).toHaveLength(1);
    expect(within(historico).getAllByText(EMPRESA)).toHaveLength(2);

    await fireEvent.press(aberto);
    expect(titulo(EMPRESA)).toBeNull();
    expect(botao(`Abrir conversa com ${PENDENTE}`)).toBeCollapsed();
  });

  it('uma conversa por tela: abrir a segunda fecha a primeira', async () => {
    await abrir();
    await abrirConversa(PENDENTE);
    expect(await screen.findByText('Combinado, portão 2.')).toBeOnTheScreen();

    await abrirConversa(ACEITA);
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
    expect(screen.queryByText('Combinado, portão 2.')).toBeNull();
    expect(screen.getAllByLabelText('Mensagem')).toHaveLength(1);
    expect(botao(`Abrir conversa com ${PENDENTE}`)).toBeCollapsed();
    expect(botao(`Fechar conversa com ${ACEITA}`)).toBeExpanded();
  });
});

describe('chat da proposta do motorista: enviar', () => {
  it('201: o campo é limpo e a mensagem aparece depois da releitura', async () => {
    let enviadas: string[] = [];
    servidor.use(
      http.get(urlMock(ROTA_MENSAGENS(PROPOSTA_ACEITE_ID)), () =>
        HttpResponse.json({
          mensagens: enviadas.map((texto, i) => ({
            id: `eeeeeeee-0000-4000-8000-00000000030${i}`,
            remetente_id: usuarioMotorista.usuario.id,
            texto,
            criado_em: new Date().toISOString(),
          })),
        }),
      ),
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_ACEITE_ID)), async ({ request }) => {
        const { texto } = (await request.json()) as { texto: string };
        enviadas = [...enviadas, texto];
        return HttpResponse.json(
          {
            mensagem: {
              id: 'eeeeeeee-0000-4000-8000-000000000300',
              proposta_id: PROPOSTA_ACEITE_ID,
              remetente_id: usuarioMotorista.usuario.id,
              texto,
              criado_em: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );
    await abrir();
    await abrirConversa(ACEITA);
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();

    await fireEvent.changeText(campo(), 'Chego às 14h no portão 2');
    await fireEvent.press(botao('Enviar'));

    expect(await screen.findByText('Chego às 14h no portão 2')).toBeOnTheScreen();
    expect(screen.getByText('Você')).toBeOnTheScreen();
    expect(campo().props.value).toBe('');
  });

  it('texto só com espaços, longo ou com contato é barrado antes do POST', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await abrirConversa(PENDENTE);
    await screen.findByText('Combinado, portão 2.');

    await fireEvent.changeText(campo(), '   ');
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
    expect(posts).not.toHaveBeenCalled();
  });

  it('409: a conversa passa a encerrada, o histórico fica e o envio é desligado com o motivo', async () => {
    servidor.use(
      http.post(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        respostaErro(409, 'proposta encerrada: não é possível enviar mensagens'),
      ),
    );
    await abrir();
    await abrirConversa(PENDENTE);
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

describe('chat da proposta do motorista: encerrada e falhas', () => {
  it('proposta recusada: histórico legível e envio desligado, com o motivo em texto', async () => {
    const posts = jest.fn();
    servidor.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts();
    });
    await abrir();
    await abrirConversa(RECUSADA);

    expect(
      await screen.findByText('Agradecemos o interesse, mas a carga seguiu com outro motorista.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
    ).toBeOnTheScreen();
    expect(campo().props.editable).toBe(false);
    expect(botao('Enviar')).toBeDisabled();
    expect(posts).not.toHaveBeenCalled();
  });

  it('proposta expirada: também encerrada', async () => {
    await abrir();
    await abrirConversa(EXPIRADA);
    expect(
      await screen.findByText('Esta proposta foi encerrada. Você ainda pode ler a conversa.'),
    ).toBeOnTheScreen();
    expect(botao('Enviar')).toBeDisabled();
  });

  it('500 ao ler: erro dentro da conversa e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock(ROTA_MENSAGENS(PROPOSTA_PENDENTE_ID)), () =>
        falhar ? respostaErro(500, 'erro interno') : HttpResponse.json({ mensagens: [] }),
      ),
    );
    await abrir();
    await abrirConversa(PENDENTE);
    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();

    falhar = false;
    await fireEvent.press(botao('Tentar de novo'));
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
  });
});
