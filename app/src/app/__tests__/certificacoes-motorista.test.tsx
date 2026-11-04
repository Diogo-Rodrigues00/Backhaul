// Minhas certificações do motorista (MVP-19, card 031): tela real, API de mock (MSW). Lista com as três
// situações, cadastro, reenvio, validade (data inexistente, passado e a borda do fuso/UTC), erros da API.
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
import { anunciar, moverFoco } from '@/lib/a11y';
import { MENSAGEM_FALHA } from '@/lib/erros';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import {
  CERT_INDIVISIVEIS_ID,
  CERT_MOPP_3_ID,
  CERT_MOPP_8_ID,
  minhasCertificacoesMock,
} from '../../../mocks/fixtures/certificacoes';
import { dataDaquiADias } from '../../../mocks/fixtures/datas';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import MinhasCertificacoes from '../motorista/certificacoes';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoCertificacoesMotorista.carregar', () => ({
  carregarCorpoCertificacoesMotorista: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCertificacoesMotorista')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = jest.mocked(anunciar);
const focoMovido = jest.mocked(moverFoco);

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

const NOME_MOPP_3 = 'MOPP - Classe 3 Inflamáveis';
const NOME_MOPP_8 = 'MOPP - Classe 8 Corrosivos';
const NOME_INDIVISIVEIS = 'Transporte de Cargas Indivisíveis';

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <MinhasCertificacoes />
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
    { _layout: Raiz, 'motorista/certificacoes': Tela },
    { initialUrl: '/motorista/certificacoes' },
  );
  return cliente;
}

/** Espera a lista e o formulário (os dois chegam por React.lazy e por duas leituras). */
async function abrirPronto() {
  const cliente = await abrir();
  await screen.findByRole('button', { name: /^(Enviar|Reenviar) para aprovação$/ });
  return cliente;
}

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);
const cartoes = () => comPapel('article');

/** O cartão (article) cujo h3 tem o nome dado. */
function cartao(nome: string) {
  const titulo = screen.getByRole('heading', { name: nome });
  const achado = cartoes().find((el) => el.props['aria-labelledby'] === titulo.props.nativeID);
  if (!achado) throw new Error(`cartão de ${nome} não encontrado`);
  return achado;
}

const seletor = () => screen.getByLabelText('Certificação');
const campoNumero = () => screen.getByLabelText('Número do certificado');
const campoDia = () => screen.getByLabelText('Dia');
const campoMes = () => screen.getByLabelText('Mês');
const campoAno = () => screen.getByLabelText('Ano');
const botaoEnviar = () =>
  screen.getByRole('button', { name: /^(Enviar|Reenviar) para aprovação$/ });
const grupoValidade = () =>
  comPapel('group').find((el) => el.props.accessibilityLabel === 'Validade');

async function escolherCertificacao(id: string, indice: number) {
  await fireEvent(seletor(), 'change', { nativeEvent: { newValue: id, newIndex: indice } });
}

/** Parte de uma data `AAAA-MM-DD` nos três campos. */
async function digitarValidade(data: string) {
  const [ano = '', mes = '', dia = ''] = data.split('-');
  await fireEvent.changeText(campoDia(), dia);
  await fireEvent.changeText(campoMes(), mes);
  await fireEvent.changeText(campoAno(), ano);
}

/** Hoje, amanhã etc. no relógio LOCAL (é o que o formulário valida). */
function dataLocalDaquiADias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

type CorpoEnviado = Record<string, unknown>;

/** Registra os corpos de `POST /certificacoes/minhas` e responde 201. */
function capturarEnvios() {
  const envios: CorpoEnviado[] = [];
  servidor.use(
    http.post(urlMock('/certificacoes/minhas'), async ({ request }) => {
      const corpo = (await request.json()) as CorpoEnviado;
      envios.push(corpo);
      return HttpResponse.json(
        {
          certificacao: {
            id: 'dddddddd-0000-4000-8000-0000000000aa',
            certificacao_id: corpo.certificacao_id,
            numero_certificado: corpo.numero_certificado,
            validade: corpo.validade,
            validado_por_admin: false,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),
  );
  return envios;
}

beforeEach(() => {
  anunciado.mockClear();
  focoMovido.mockClear();
});

afterEach(() => sairDoMock());

describe('lista de certificações (MVP-19)', () => {
  it('h1, lista na ordem da API e, em cada cartão, nome, número, validade só com a data e situação em texto', async () => {
    await abrirPronto();

    expect(screen.getByRole('heading', { name: 'Minhas certificações' }).props['aria-level']).toBe(
      1,
    );
    const lista = comPapel('list').find(
      (el) => el.props['aria-label'] === 'Certificações enviadas',
    );
    expect(lista).toBeDefined();
    expect(cartoes()).toHaveLength(3);
    const nomes = screen
      .getAllByRole('heading')
      .filter((h) => h.props['aria-level'] === 3)
      .map((h) => h.props.children as string);
    expect(nomes).toEqual([NOME_MOPP_3, NOME_MOPP_8, NOME_INDIVISIVEIS]);

    const aprovada = within(cartao(NOME_MOPP_3));
    expect(aprovada.getByText('123456')).toBeOnTheScreen();
    expect(aprovada.getByText('Aprovada')).toBeOnTheScreen();
    expect(within(cartao(NOME_MOPP_8)).getByText('Aguardando aprovação')).toBeOnTheScreen();
    expect(within(cartao(NOME_INDIVISIVEIS)).getByText('Vencida')).toBeOnTheScreen();

    // Validade só com a data, no formato brasileiro, nunca com hora.
    for (const certificacao of minhasCertificacoesMock) {
      const [ano, mes, dia] = certificacao.validade.split('-');
      expect(within(cartao(certificacao.nome)).getByText(`${dia}/${mes}/${ano}`)).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
  });

  it('"Reenviar" só em pendente e vencida, com o nome da certificação no nome do botão', async () => {
    await abrirPronto();

    expect(screen.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Reenviar ${NOME_INDIVISIVEIS}` })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `Reenviar ${NOME_MOPP_3}` })).not.toBeOnTheScreen();
    expect(within(cartao(NOME_MOPP_3)).queryAllByRole('button')).toHaveLength(0);
  });

  it('estado vazio: "Você ainda não enviou certificações" e o formulário visível', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () => HttpResponse.json({ certificacoes: [] })),
    );
    await abrirPronto();

    expect(await screen.findByText('Você ainda não enviou certificações')).toBeOnTheScreen();
    expect(cartoes()).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Enviar certificação' })).toBeOnTheScreen();
    expect(seletor()).toBeOnTheScreen();

    // A ação do vazio leva o foco ao formulário.
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar certificação' }));
    expect(focoMovido).toHaveBeenCalled();
  });

  it('CT-01: enquanto carrega, mostra "Carregando suas certificações…"', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), async () => {
        await new Promise((resolver) => setTimeout(resolver, 300));
        return HttpResponse.json({ certificacoes: minhasCertificacoesMock });
      }),
    );
    await abrir();
    expect(screen.getByText('Carregando suas certificações…')).toBeOnTheScreen();
    expect(await screen.findByRole('heading', { name: NOME_MOPP_3 })).toBeOnTheScreen();
  });

  it('CT-03: falha 500 mostra a mensagem padrão e "Tentar de novo" refaz a leitura', async () => {
    let falhar = true;
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () =>
        falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json({ certificacoes: minhasCertificacoesMock }),
      ),
    );
    await abrir();
    expect(await screen.findByText(MENSAGEM_FALHA)).toBeOnTheScreen();
    expect(screen.queryByRole('form')).not.toBeOnTheScreen();

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: NOME_MOPP_3 })).toBeOnTheScreen();
  });

  it('404 sem perfil de motorista: mostra a mensagem da API', async () => {
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () =>
        respostaErro(404, 'perfil de motorista não encontrado'),
      ),
    );
    await abrir();
    expect(await screen.findByText('perfil de motorista não encontrado')).toBeOnTheScreen();
  });

  it('401 em qualquer leitura chama o encerramento da sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrir(aoSessaoExpirada);
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });

  it('"Atualizar" busca a lista de novo', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () => {
        leituras += 1;
        return HttpResponse.json({ certificacoes: minhasCertificacoesMock });
      }),
    );
    await abrirPronto();
    expect(leituras).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(leituras).toBe(2));
  });
});

describe('formulário: campos e seletor', () => {
  it('formulário nomeado, campos rotulados e o grupo Validade com Dia, Mês e Ano', async () => {
    await abrirPronto();

    const formularios = comPapel('form');
    expect(formularios.map((f) => f.props['aria-label'])).toEqual(['Enviar certificação']);
    expect(screen.getByRole('heading', { name: 'Enviar certificação' }).props['aria-level']).toBe(
      2,
    );
    expect(seletor()).toBeOnTheScreen();
    expect(campoNumero()).toBeOnTheScreen();
    const grupo = grupoValidade();
    expect(grupo).toBeDefined();
    expect(campoDia()).toBeOnTheScreen();
    expect(campoMes()).toBeOnTheScreen();
    expect(campoAno()).toBeOnTheScreen();
    // O aviso de reenvio só aparece quando é reenvio.
    expect(
      screen.queryByText('Ao reenviar, a certificação volta para Aguardando aprovação.'),
    ).not.toBeOnTheScreen();
  });

  it('a certificação aprovada e vigente aparece no seletor como "já aprovada"', async () => {
    await abrirPronto();
    const itens = seletor().props.items as { value: string; label: string }[];
    expect(itens.map((item) => item.label)).toEqual([
      'Escolha a certificação',
      `${NOME_MOPP_3} (já aprovada)`,
      NOME_MOPP_8,
      NOME_INDIVISIVEIS,
    ]);
  });

  it('escolher a aprovada no iPhone (que ignora "desabilitada") é recusado antes do POST', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_3_ID, 1);
    await fireEvent.changeText(campoNumero(), '123456');
    await digitarValidade(dataLocalDaquiADias(400));
    await fireEvent.press(botaoEnviar());

    expect(
      (await screen.findAllByText('Esta certificação já está aprovada e dentro da validade.'))
        .length,
    ).toBeGreaterThan(0);
    expect(envios).toHaveLength(0);
  });
});

describe('cadastro (MVP-19)', () => {
  it('201: envia o corpo exato, anuncia, recarrega a lista e limpa o formulário', async () => {
    const envios = capturarEnvios();
    // Depois do envio a lista traz a nova certificação como pendente.
    let enviou = false;
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () =>
        HttpResponse.json({
          certificacoes: enviou
            ? [
                ...minhasCertificacoesMock,
                {
                  id: 'dddddddd-0000-4000-8000-0000000000aa',
                  certificacao_id: 'aaaaaaaa-0000-4000-8000-0000000000ff',
                  nome: 'ADR - Classe 9 Diversos',
                  numero_certificado: 'ADR-9-1',
                  validade: dataDaquiADias(500),
                  validado_por_admin: false,
                  situacao: 'pendente',
                  criado_em: new Date().toISOString(),
                },
              ]
            : minhasCertificacoesMock,
        }),
      ),
      http.post(urlMock('/certificacoes/minhas'), async ({ request }) => {
        enviou = true;
        envios.push((await request.json()) as CorpoEnviado);
        return HttpResponse.json(
          {
            certificacao: {
              id: 'dddddddd-0000-4000-8000-0000000000aa',
              certificacao_id: 'aaaaaaaa-0000-4000-8000-0000000000ff',
              numero_certificado: 'ADR-9-1',
              validade: dataDaquiADias(500),
              validado_por_admin: false,
              criado_em: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
      http.get(urlMock('/certificacoes'), () =>
        HttpResponse.json({
          certificacoes: [
            { id: CERT_MOPP_3_ID, nome: NOME_MOPP_3, classificacao_onu: '3' },
            {
              id: 'aaaaaaaa-0000-4000-8000-0000000000ff',
              nome: 'ADR - Classe 9 Diversos',
              classificacao_onu: '9',
            },
          ],
        }),
      ),
    );
    await abrirPronto();
    expect(cartoes()).toHaveLength(3);

    await escolherCertificacao('aaaaaaaa-0000-4000-8000-0000000000ff', 2);
    await fireEvent.changeText(campoNumero(), '  ADR-9-1  ');
    const validade = dataLocalDaquiADias(500);
    await digitarValidade(validade);
    await fireEvent.press(botaoEnviar());

    await waitFor(() => expect(envios).toHaveLength(1));
    // Só os três campos do contrato; número sem espaços nas pontas; validade AAAA-MM-DD.
    expect(Object.keys(envios[0]!).sort()).toEqual([
      'certificacao_id',
      'numero_certificado',
      'validade',
    ]);
    expect(envios[0]).toEqual({
      certificacao_id: 'aaaaaaaa-0000-4000-8000-0000000000ff',
      numero_certificado: 'ADR-9-1',
      validade,
    });

    // Mensagem visível e anunciada; a lista foi recarregada e mostra o novo, aguardando aprovação.
    expect(
      await screen.findByText('Certificação enviada. Aguardando aprovação.'),
    ).toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledWith('Certificação enviada. Aguardando aprovação.');
    await waitFor(() => expect(cartoes()).toHaveLength(4));
    const novo = within(cartao('ADR - Classe 9 Diversos'));
    expect(novo.getByText('Aguardando aprovação')).toBeOnTheScreen();
    expect(novo.getByText('Enviada agora')).toBeOnTheScreen();
    // Formulário limpo para o próximo envio.
    expect(campoNumero().props.value).toBe('');
    expect(campoAno().props.value).toBe('');
  });

  it('clique duplo em enviar faz uma requisição só (CT-01)', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '999');
    await digitarValidade(dataLocalDaquiADias(400));
    const botao = botaoEnviar();
    await fireEvent.press(botao);
    await fireEvent.press(botao);

    await waitFor(() => expect(anunciado).toHaveBeenCalled());
    expect(envios).toHaveLength(1);
  });
});

describe('reenvio (MVP-19)', () => {
  it('"Reenviar" de pendente abre o formulário com a certificação e o número, avisa e envia pelo mesmo POST', async () => {
    const envios = capturarEnvios();
    await abrirPronto();

    await fireEvent.press(screen.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` }));

    // Formulário em modo reenvio: título, preenchido, aviso visível antes de enviar e foco no título.
    expect(await screen.findByRole('heading', { name: 'Reenviar certificação' })).toBeOnTheScreen();
    expect(campoNumero().props.value).toBe('654321');
    expect(seletor().props.selectedIndex).toBe(2);
    expect(
      screen.getByText('Ao reenviar, a certificação volta para Aguardando aprovação.'),
    ).toBeOnTheScreen();
    expect(focoMovido).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reenviar para aprovação' })).toBeOnTheScreen();

    const validade = dataLocalDaquiADias(600);
    await digitarValidade(validade);
    await fireEvent.press(botaoEnviar());

    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]).toEqual({
      certificacao_id: CERT_MOPP_8_ID,
      numero_certificado: '654321',
      validade,
    });
    expect(anunciado).toHaveBeenCalledWith('Certificação enviada. Aguardando aprovação.');
    // Depois de enviar, volta ao cadastro novo.
    expect(await screen.findByRole('heading', { name: 'Enviar certificação' })).toBeOnTheScreen();
  });

  it('"Reenviar" de vencida também abre o formulário com os dados', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await fireEvent.press(screen.getByRole('button', { name: `Reenviar ${NOME_INDIVISIVEIS}` }));
    expect(await screen.findByRole('heading', { name: 'Reenviar certificação' })).toBeOnTheScreen();
    expect(campoNumero().props.value).toBe('777001');
    await digitarValidade(dataLocalDaquiADias(365));
    await fireEvent.press(botaoEnviar());
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]!.certificacao_id).toBe(CERT_INDIVISIVEIS_ID);
  });

  it('escolher no seletor uma certificação que já está na lista também mostra o aviso de reenvio', async () => {
    await abrirPronto();
    await escolherCertificacao(CERT_INDIVISIVEIS_ID, 3);
    expect(
      await screen.findByText('Ao reenviar, a certificação volta para Aguardando aprovação.'),
    ).toBeOnTheScreen();
  });

  it('"Cancelar reenvio" volta ao cadastro novo, sem enviar nada', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await fireEvent.press(screen.getByRole('button', { name: `Reenviar ${NOME_MOPP_8}` }));
    await screen.findByRole('heading', { name: 'Reenviar certificação' });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar reenvio' }));

    expect(await screen.findByRole('heading', { name: 'Enviar certificação' })).toBeOnTheScreen();
    expect(campoNumero().props.value).toBe('');
    expect(envios).toHaveLength(0);
  });
});

describe('validação local (D-PO-14)', () => {
  it('tudo vazio: resumo com os três erros, foco no resumo e nada é enviado', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await fireEvent.press(botaoEnviar());

    expect(await screen.findByText('Corrija 3 campos para continuar.')).toBeOnTheScreen();
    expect(screen.getAllByText('Escolha a certificação.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Informe o número do certificado.').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.').length,
    ).toBeGreaterThan(0);
    expect(comPapel('alert').length).toBeGreaterThan(0);
    expect(focoMovido).toHaveBeenCalled();
    expect(envios).toHaveLength(0);
    // O erro da validade fica ligado ao grupo (uma mensagem, apontada pelas três partes).
    expect(grupoValidade()?.props['aria-describedby']).toMatch(/-erro/);
    expect(campoDia().props['aria-invalid']).toBe(true);
    expect(campoMes().props['aria-invalid']).toBe(true);
    expect(campoAno().props['aria-invalid']).toBe(true);
  });

  it('data que não existe (31/02) é bloqueada antes do POST', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '1');
    await fireEvent.changeText(campoDia(), '31');
    await fireEvent.changeText(campoMes(), '02');
    await fireEvent.changeText(campoAno(), String(new Date().getFullYear() + 2));
    await fireEvent.press(botaoEnviar());

    expect(
      (await screen.findAllByText('Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.'))
        .length,
    ).toBeGreaterThan(0);
    expect(envios).toHaveLength(0);
  });

  it('ano com 2 dígitos e mês 13 também são bloqueados', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '1');
    await fireEvent.changeText(campoDia(), '10');
    await fireEvent.changeText(campoMes(), '13');
    await fireEvent.changeText(campoAno(), '2030');
    await fireEvent.press(botaoEnviar());
    await screen.findAllByText('Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.');

    await fireEvent.changeText(campoMes(), '12');
    await fireEvent.changeText(campoAno(), '30');
    await fireEvent.press(botaoEnviar());
    await waitFor(() =>
      expect(
        screen.getAllByText('Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.').length,
      ).toBeGreaterThan(0),
    );
    expect(envios).toHaveLength(0);
  });

  it('data anterior a hoje (relógio local) é bloqueada antes do POST', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '1');
    await digitarValidade(dataLocalDaquiADias(-1));
    await fireEvent.press(botaoEnviar());

    expect(
      (
        await screen.findAllByText(
          'A validade não pode estar no passado. Informe hoje ou uma data futura.',
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(envios).toHaveLength(0);
  });

  it('hoje (relógio local) passa pela validação do app e vai ao POST', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '1');
    await digitarValidade(dataLocalDaquiADias(0));
    await fireEvent.press(botaoEnviar());
    await waitFor(() => expect(envios).toHaveLength(1));
  });

  it('número com mais de 60 caracteres é bloqueado no campo; com 60 passa', async () => {
    const envios = capturarEnvios();
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await digitarValidade(dataLocalDaquiADias(400));
    await fireEvent.changeText(campoNumero(), 'x'.repeat(61));
    await fireEvent.press(botaoEnviar());

    expect((await screen.findAllByText('Use no máximo 60 caracteres.')).length).toBeGreaterThan(0);
    expect(envios).toHaveLength(0);

    await fireEvent.changeText(campoNumero(), 'x'.repeat(60));
    await fireEvent.press(botaoEnviar());
    await waitFor(() => expect(envios).toHaveLength(1));
  });
});

describe('erros da API', () => {
  async function preencherEEnviar() {
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '777');
    await digitarValidade(dataLocalDaquiADias(400));
    await fireEvent.press(botaoEnviar());
  }

  it('400 por campo: cada mensagem vai ao campo certo, com o foco no campo', async () => {
    servidor.use(
      http.post(urlMock('/certificacoes/minhas'), () =>
        respostaErros(400, [
          'certificacao_id não corresponde a nenhuma certificação',
          'numero_certificado deve ter no máximo 60 caracteres',
          'validade deve ser uma data válida no formato AAAA-MM-DD',
        ]),
      ),
    );
    await preencherEEnviar();

    expect(
      await screen.findByText('certificacao_id não corresponde a nenhuma certificação'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('numero_certificado deve ter no máximo 60 caracteres'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('validade deve ser uma data válida no formato AAAA-MM-DD'),
    ).toBeOnTheScreen();
    expect(seletor().props.accessibilityHint).toContain(
      'certificacao_id não corresponde a nenhuma certificação',
    );
    expect(campoNumero().props['aria-invalid']).toBe(true);
    expect(campoDia().props['aria-invalid']).toBe(true);
    expect(anunciado).not.toHaveBeenCalledWith('Certificação enviada. Aguardando aprovação.');
  });

  it('400 "validade não pode estar no passado" para uma data que o app aceitou (borda do fuso/UTC): explica no grupo Validade', async () => {
    servidor.use(
      http.post(urlMock('/certificacoes/minhas'), () =>
        respostaErros(400, ['validade não pode estar no passado']),
      ),
    );
    await abrirPronto();
    await escolherCertificacao(CERT_MOPP_8_ID, 2);
    await fireEvent.changeText(campoNumero(), '777');
    await digitarValidade(dataLocalDaquiADias(0));
    await fireEvent.press(botaoEnviar());

    expect(
      await screen.findByText(
        'O servidor recusou esta data como passada: ele usa o horário UTC, que à noite já é o dia seguinte. Informe a partir de amanhã.',
      ),
    ).toBeOnTheScreen();
    expect(grupoValidade()?.props['aria-describedby']).toMatch(/-erro/);
    expect(screen.queryByText('validade não pode estar no passado')).not.toBeOnTheScreen();
  });

  it('409 (já aprovada e vigente): mostra a mensagem e recarrega a lista', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/certificacoes/minhas'), () => {
        leituras += 1;
        return HttpResponse.json({ certificacoes: minhasCertificacoesMock });
      }),
      http.post(urlMock('/certificacoes/minhas'), () =>
        respostaErro(409, 'certificação já aprovada e dentro da validade'),
      ),
    );
    await preencherEEnviar();

    expect(
      (await screen.findAllByText('certificação já aprovada e dentro da validade')).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(leituras).toBe(2));
    expect(anunciado).not.toHaveBeenCalledWith('Certificação enviada. Aguardando aprovação.');
  });

  it('500: mensagem padrão no resumo e "Tentar de novo" reenvia', async () => {
    let falhar = true;
    const envios: CorpoEnviado[] = [];
    servidor.use(
      http.post(urlMock('/certificacoes/minhas'), async ({ request }) => {
        envios.push((await request.json()) as CorpoEnviado);
        return falhar
          ? respostaErro(500, 'erro interno')
          : HttpResponse.json(
              {
                certificacao: {
                  id: 'dddddddd-0000-4000-8000-0000000000aa',
                  certificacao_id: CERT_MOPP_8_ID,
                  numero_certificado: '777',
                  validade: dataDaquiADias(400),
                  validado_por_admin: false,
                  criado_em: new Date().toISOString(),
                },
              },
              { status: 201 },
            );
      }),
    );
    await preencherEEnviar();

    expect((await screen.findAllByText(MENSAGEM_FALHA)).length).toBeGreaterThan(0);
    expect(focoMovido).toHaveBeenCalled();
    // Os campos continuam preenchidos.
    expect(campoNumero().props.value).toBe('777');

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(envios).toHaveLength(2));
    await waitFor(() =>
      expect(anunciado).toHaveBeenCalledWith('Certificação enviada. Aguardando aprovação.'),
    );
  });
});
