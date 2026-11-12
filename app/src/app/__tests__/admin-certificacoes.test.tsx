// Aprovações do admin (card 032, MVP-20). Tela real com a área protegida e a API de mock (MSW): lista,
// vazio, erro, aprovar, recusar, 404 e a regra de privacidade (CPF e CNH nunca chegam à tela, ao cache
// nem ao console). O 401 fica por último: redireciona para o login e muda a navegação do render.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import type { CertificacaoPendenteDoContrato } from '@/api/tipos';
import { moverFoco } from '@/lib/a11y';
import { ouvirAnuncios } from '@/lib/anuncios';
import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { certificacoesPendentesContratoMock } from '../../../mocks/fixtures/certificacoes';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste } from '../../../mocks/utils-teste';
import LayoutAdmin from '../admin/_layout';
import AprovacoesDeCertificacoes from '../admin/certificacoes';

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

// O Jest não executa `import()` dinâmico: o corpo vem na hora (como em jest.setup.ts para os demais).
jest.mock('@/telas/CorpoCertificacoesPendentes.carregar', () => ({
  carregarCorpoCertificacoesPendentes: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCertificacoesPendentes')),
}));

// moverFoco usa findNodeHandle (sem efeito no renderer de teste): espiado para ver quem recebe o foco.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));
const moverFocoMock = jest.mocked(moverFoco);

const [MARIA, JOAO] = certificacoesPendentesContratoMock as [
  CertificacaoPendenteDoContrato,
  CertificacaoPendenteDoContrato,
];
const NOME_MARIA = 'Transporte de Cargas Indivisíveis de Maria Souza';
const NOME_JOAO = 'MOPP - Classe 8 Corrosivos de João da Silva';

function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre `/admin/certificacoes` com a sessão restaurada pelo token gravado antes. */
async function abrir(esperarSessao = true) {
  const cliente = criarClienteDeTeste();
  function LayoutRaiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <SessaoProvider>
            <Sonda />
            <Slot />
          </SessaoProvider>
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    {
      _layout: LayoutRaiz,
      index: () => <Text>Início</Text>,
      entrar: () => <Text>Tela de entrada</Text>,
      'admin/_layout': LayoutAdmin,
      'admin/certificacoes': AprovacoesDeCertificacoes,
    },
    { initialUrl: '/admin/certificacoes' },
  );
  if (esperarSessao) {
    await waitFor(() =>
      expect((screen.getByTestId('rota').props.children as string).split('|')[1]).toBe(
        'autenticado',
      ),
    );
  }
  return cliente;
}

/** Fila com estado: o POST tira o item da fila e é registrado; o GET devolve o que sobrou (com cpf e cnh). */
function filaComEstado(inicial: CertificacaoPendenteDoContrato[] = [MARIA, JOAO]) {
  let fila = [...inicial];
  const decisoes: { id: string; acao: unknown }[] = [];
  const leituras = { total: 0 };
  servidor.use(
    http.get(urlMock('/certificacoes/pendentes'), () => {
      leituras.total += 1;
      return HttpResponse.json({ certificacoes: fila });
    }),
    http.post(urlMock('/certificacoes/pendentes/:id/responder'), async ({ request, params }) => {
      const corpo = (await request.json()) as { acao: string };
      const id = String(params.id);
      decisoes.push({ id, acao: corpo.acao });
      fila = fila.filter((item) => item.id !== id);
      return HttpResponse.json({
        certificacao:
          corpo.acao === 'aprovar' ? { id, validado_por_admin: true } : { id, recusada: true },
      });
    }),
  );
  return { decisoes, leituras };
}

const titulos = (nivel: number) =>
  screen
    .getAllByRole('heading')
    .filter((h) => h.props['aria-level'] === nivel)
    .map((h) => h.props.children);

async function aguardarLista() {
  await screen.findByRole('heading', { name: 'Maria Souza' });
}

/** Procura um texto na árvore de elementos React (`props.children`, em profundidade). */
function contemTexto(no: unknown, texto: string): boolean {
  if (no === texto) return true;
  if (Array.isArray(no)) return no.some((filho) => contemTexto(filho, texto));
  if (no !== null && typeof no === 'object' && 'props' in no) {
    return contemTexto((no as { props: { children?: unknown } }).props.children, texto);
  }
  return false;
}

/** O `Modal` com o diálogo aberto: guardado antes de confirmar, porque some quando o diálogo fecha. */
const modalDoDialogo = () => {
  const [modal] = screen.container.queryAll((el) => el.type === 'Modal');
  if (!modal) throw new Error('Modal do diálogo não encontrado');
  return modal;
};

/** O que o Modal faz ao terminar a saída: o diálogo só devolve o foco depois do `onDismiss`. */
async function terminarSaidaDoDialogo(modal: ReturnType<typeof modalDoDialogo>) {
  await act(async () => {
    (modal.props as { onDismiss: () => void }).onDismiss();
  });
}

const dialogo = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');

/** O que `moverFoco` recebeu por último: o `refRetorno` do diálogo, resolvido ao fechar. */
function alvoDoUltimoFoco(): { current: unknown } {
  const chamadas = moverFocoMock.mock.calls;
  const ultima = chamadas[chamadas.length - 1];
  if (!ultima) throw new Error('moverFoco não foi chamado');
  return ultima[0] as { current: unknown };
}

beforeEach(async () => {
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-admin');
  moverFocoMock.mockClear();
});

describe('Aprovações de certificações (admin)', () => {
  it('lista na ordem da API: h1, h2 da fila e um h3 por motorista, com os dados da certificação', async () => {
    await abrir();
    await aguardarLista();

    expect(titulos(1)).toEqual(['Aprovações']);
    expect(titulos(2)).toEqual(['Certificações pendentes']);
    expect(titulos(3)).toEqual(['Maria Souza', 'João da Silva']);
    expect(screen.getByText('XYZ9K88')).toBeOnTheScreen();
    expect(screen.getByText('ABC1D23')).toBeOnTheScreen();
    expect(screen.getByText('880011')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    // Botões com nome único, para o leitor de tela distinguir um cartão do outro.
    expect(screen.getByRole('button', { name: `Aprovar ${NOME_MARIA}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Recusar ${NOME_MARIA}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Aprovar ${NOME_JOAO}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Recusar ${NOME_JOAO}` })).toBeOnTheScreen();
  });

  it('privacidade: CPF e CNH da API não aparecem na tela, no cache nem no console', async () => {
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) =>
      jest.spyOn(console, metodo).mockImplementation(() => undefined),
    );
    const cliente = await abrir();
    await aguardarLista();

    const valoresProibidos = certificacoesPendentesContratoMock.flatMap(({ motorista }) => [
      motorista.cpf,
      motorista.cnh,
    ]);
    expect(valoresProibidos).toHaveLength(4);
    // O mock responde com cpf e cnh (como o backend): se o fetcher não os descartasse, estariam aqui.
    const arvore = JSON.stringify(screen.toJSON());
    const cache = JSON.stringify(
      cliente
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    );
    const registroDoConsole = JSON.stringify(consoles.flatMap((espia) => espia.mock.calls));
    for (const valor of valoresProibidos) {
      expect(arvore).not.toContain(valor);
      expect(cache).not.toContain(valor);
      expect(registroDoConsole).not.toContain(valor);
    }
    expect(cache).not.toMatch(/"cpf"|"cnh"/);
    expect(screen.queryByText(/CPF|CNH/i)).toBeNull();
    // Também pelo rótulo acessível (aria-label / label de campo), não só pelo texto visível.
    expect(screen.queryByLabelText(/cpf|cnh|senha/i)).toBeNull();
    consoles.forEach((espia) => espia.mockRestore());
  });

  it('aprovar: só depois do diálogo; 200 tira o cartão, anuncia e leva o foco ao próximo cartão', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((mensagem) => anuncios.push(mensagem));
    const { decisoes } = filaComEstado();
    await abrir();
    await aguardarLista();

    await fireEvent.press(screen.getByRole('button', { name: `Aprovar ${NOME_MARIA}` }));
    expect(
      await screen.findByRole('heading', { name: `Aprovar ${NOME_MARIA}?` }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('O motorista passa a ver cargas que exigem essa certificação.'),
    ).toBeOnTheScreen();
    expect(decisoes).toEqual([]);

    const modal = modalDoDialogo();
    await fireEvent.press(within(dialogo()[0]!).getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Maria Souza' })).toBeNull());
    expect(decisoes).toEqual([{ id: MARIA.id, acao: 'aprovar' }]);
    expect(titulos(3)).toEqual(['João da Silva']);
    expect(anuncios).toContain('Certificação aprovada');
    expect(screen.getByText('Certificação aprovada')).toBeOnTheScreen();
    // O foco vai ao cartão seguinte (João), que continua na lista.
    await terminarSaidaDoDialogo(modal);
    const alvo = alvoDoUltimoFoco().current as { props: Record<string, unknown> };
    expect(alvo.props.role).toBe('article');
    expect(contemTexto(alvo.props.children, 'João da Silva')).toBe(true);
    parar();
  });

  it('recusar: o diálogo avisa que o envio é apagado; 200 anuncia "Certificação recusada"', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((mensagem) => anuncios.push(mensagem));
    const { decisoes } = filaComEstado();
    await abrir();
    await aguardarLista();

    await fireEvent.press(screen.getByRole('button', { name: `Recusar ${NOME_JOAO}` }));
    expect(await screen.findByRole('heading', { name: `Recusar ${NOME_JOAO}?` })).toBeOnTheScreen();
    expect(
      screen.getByText('O envio é apagado e o motorista pode mandar de novo.'),
    ).toBeOnTheScreen();
    const modal = modalDoDialogo();
    await fireEvent.press(within(dialogo()[0]!).getByRole('button', { name: 'Recusar' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'João da Silva' })).toBeNull(),
    );
    expect(decisoes).toEqual([{ id: JOAO.id, acao: 'recusar' }]);
    expect(anuncios).toContain('Certificação recusada');
    // João era o último: o foco vai ao título da lista (h2), que existe em qualquer estado.
    await terminarSaidaDoDialogo(modal);
    const alvo = alvoDoUltimoFoco().current as { props: Record<string, unknown> };
    expect(alvo.props['aria-level']).toBe(2);
    expect(alvo.props.children).toBe('Certificações pendentes');
    parar();
  });

  it('cancelar fecha o diálogo, não envia nada e devolve o foco ao botão que o abriu', async () => {
    const { decisoes } = filaComEstado();
    await abrir();
    await aguardarLista();

    const botao = screen.getByRole('button', { name: `Aprovar ${NOME_MARIA}` });
    await fireEvent.press(botao);
    await screen.findByRole('heading', { name: `Aprovar ${NOME_MARIA}?` });
    const modal = modalDoDialogo();
    await fireEvent.press(within(dialogo()[0]!).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(dialogo()).toHaveLength(0));
    await terminarSaidaDoDialogo(modal);
    expect(decisoes).toEqual([]);
    expect(titulos(3)).toEqual(['Maria Souza', 'João da Silva']);
    // O foco volta ao botão "Aprovar" que abriu o diálogo.
    expect(alvoDoUltimoFoco().current).toBeTruthy();
  });

  it('404 (já decidida por outro admin): avisa, fecha o diálogo e recarrega a fila', async () => {
    const anuncios: string[] = [];
    const parar = ouvirAnuncios((mensagem) => anuncios.push(mensagem));
    const { leituras } = filaComEstado([MARIA, JOAO]);
    servidor.use(
      http.post(urlMock('/certificacoes/pendentes/:id/responder'), () =>
        respostaErro(404, 'certificação pendente não encontrada'),
      ),
    );
    await abrir();
    await aguardarLista();
    const antes = leituras.total;

    await fireEvent.press(screen.getByRole('button', { name: `Aprovar ${NOME_MARIA}` }));
    await screen.findByRole('heading', { name: `Aprovar ${NOME_MARIA}?` });
    await fireEvent.press(within(dialogo()[0]!).getByRole('button', { name: 'Aprovar' }));

    expect(await screen.findByText('Essa certificação já foi decidida.')).toBeOnTheScreen();
    expect(anuncios).toContain('Essa certificação já foi decidida.');
    await waitFor(() => expect(leituras.total).toBeGreaterThan(antes));
    expect(dialogo()).toHaveLength(0);
    parar();
  });

  it('falha ao decidir (500): o diálogo continua aberto com o erro e nada sai da lista', async () => {
    filaComEstado();
    servidor.use(
      http.post(urlMock('/certificacoes/pendentes/:id/responder'), () =>
        respostaErro(500, 'erro interno'),
      ),
    );
    await abrir();
    await aguardarLista();

    await fireEvent.press(screen.getByRole('button', { name: `Recusar ${NOME_MARIA}` }));
    await screen.findByRole('heading', { name: `Recusar ${NOME_MARIA}?` });
    await fireEvent.press(within(dialogo()[0]!).getByRole('button', { name: 'Recusar' }));

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(dialogo()).toHaveLength(1);
    expect(titulos(3)).toEqual(['Maria Souza', 'João da Silva']);
  });

  it('vazio: "Nenhuma certificação aguardando aprovação"', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/pendentes'), () => HttpResponse.json({ certificacoes: [] })),
    );
    await abrir();

    expect(await screen.findByText('Nenhuma certificação aguardando aprovação')).toBeOnTheScreen();
    expect(titulos(3)).toEqual([]);
  });

  it('enquanto carrega, mostra o texto de carregamento e nenhum cartão', async () => {
    servidor.use(http.get(urlMock('/certificacoes/pendentes'), () => delay('infinite')));
    await abrir();

    expect(await screen.findByText('Carregando certificações pendentes…')).toBeOnTheScreen();
    expect(titulos(3)).toEqual([]);
  });

  it('500 na leitura: erro com "Tentar de novo" e nenhum cartão', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/pendentes'), () => respostaErro(500, 'erro interno')),
    );
    await abrir();

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(titulos(3)).toEqual([]);
  });

  it('o menu do admin tem o item "Aprovações"', async () => {
    filaComEstado();
    await abrir();
    await aguardarLista();

    const [link] = screen.getAllByRole('link', { name: 'Aprovações' });
    expect(link!.props.href).toBe('/admin/certificacoes');
  });

  // Por último: o 401 redireciona para o login e muda a navegação do render.
  it('401 apaga o token e leva ao login', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/pendentes'), () => respostaErro(401, 'token ausente')),
    );
    await abrir(false);

    await waitFor(() =>
      expect((screen.getByTestId('rota').props.children as string).split('|')[0]).toBe('/entrar'),
    );
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });
});
