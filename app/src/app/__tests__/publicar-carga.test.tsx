// Publicar carga (card 019, MVP-08, CT-01/03, D-PO-02/14). Tela real + API de mock (MSW).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';
import { Text, useWindowDimensions } from 'react-native';

import { anunciar, moverFoco } from '@/lib/a11y';
import { MENSAGEM_FALHA } from '@/lib/erros';
import { CascaContext } from '@/components/organisms/useCasca';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import { certificacoesMock } from '../../../mocks/fixtures/certificacoes';
import PublicarCarga from '../empresa/cargas/nova';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));
const anunciarMock = jest.mocked(anunciar);
const moverFocoMock = jest.mocked(moverFoco);

function Sonda() {
  return <Text testID="rota">{usePathname()}</Text>;
}

function MinhasCargasProvisoria() {
  return <Text>Lista de cargas</Text>;
}

async function abrir({ aguardarCertificacoes = true } = {}) {
  const cliente = criarClienteDeTeste();
  function LayoutRaiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <CascaContext.Provider value={{ cabecalho: null, abas: undefined, habilitado: true }}>
            <Sonda />
            <Slot />
          </CascaContext.Provider>
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    {
      _layout: LayoutRaiz,
      'empresa/cargas/index': MinhasCargasProvisoria,
      'empresa/cargas/nova': PublicarCarga,
    },
    { initialUrl: '/empresa/cargas/nova' },
  );
  // As certificações carregam: a opção do mock aparece no seletor.
  if (aguardarCertificacoes) {
    await waitFor(() => expect(opcoesDeCertificacao()).toHaveLength(certificacoesMock.length + 1));
  }
}

const caminho = () => screen.getByTestId('rota').props.children as string;
const botaoPublicar = () => screen.getByRole('button', { name: /^Publicar carga|Publicando/ });
const seletorCertificacao = () => screen.getByLabelText('Certificação exigida (opcional)');
const opcoesDeCertificacao = () =>
  (screen.queryByLabelText('Certificação exigida (opcional)')?.props.items ?? []) as {
    value: string;
    label: string;
  }[];
const alertas = () => screen.container.queryAll((el) => el.props.role === 'alert');

async function escolherCidade(rotulo: 'Origem' | 'Destino', busca: string, nome: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), busca);
  await fireEvent.press(screen.getByRole('button', { name: `Escolher ${nome}` }));
}

async function preencherTudo() {
  await fireEvent.changeText(screen.getByLabelText('Tipo de carga'), 'Produtos inflamáveis');
  await escolherCidade('Origem', 'uberl', 'Uberlândia - MG');
  await escolherCidade('Destino', 'ubera', 'Uberaba - MG');
  await fireEvent.changeText(screen.getByLabelText('Peso (kg)'), '8000');
  await fireEvent.changeText(screen.getByLabelText('Valor oferecido (R$)'), '3.500,00');
}

type CorpoEnviado = Record<string, unknown>;

/** Registra os corpos de `POST /cargas` e responde 201 (com um pequeno atraso, para o clique duplo). */
function capturarEnvios() {
  const envios: CorpoEnviado[] = [];
  servidor.use(
    http.post(urlMock('/cargas'), async ({ request }) => {
      envios.push((await request.json()) as CorpoEnviado);
      await delay(30);
      return HttpResponse.json({ carga: { id: 'nova' } }, { status: 201 });
    }),
  );
  return envios;
}

beforeEach(() => {
  // Janela larga: a prévia "Como o motorista vai ver" só aparece acima de 960 px.
  jest
    .mocked(useWindowDimensions)
    .mockReturnValue({ width: 1200, height: 900, scale: 2, fontScale: 1 });
  entrarComoMock('mock-empresa');
  anunciarMock.mockClear();
  moverFocoMock.mockClear();
});

afterEach(() => sairDoMock());

describe('a tela', () => {
  it('mostra o h1, o formulário nomeado, os campos e os padrões (MVP-08)', async () => {
    await abrir();

    expect(screen.getByRole('heading', { name: 'Publicar carga' }).props['aria-level']).toBe(1);
    const formularios = screen.container.queryAll(
      (el) => el.props.role === 'form' && el.props['aria-label'] === 'Publicar carga',
    );
    expect(formularios).toHaveLength(1);
    for (const rotulo of ['Tipo de carga', 'Origem', 'Destino', 'Peso (kg)']) {
      expect(screen.getByLabelText(rotulo)).toBeOnTheScreen();
    }
    expect(screen.getByLabelText('Valor oferecido (R$)')).toBeOnTheScreen();
    // Urgência: Normal marcada; prazo: 24 horas; certificação: Nenhuma.
    expect(screen.getByRole('radio', { name: 'Normal', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Em 24 horas', checked: true })).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3 + 5);
    const grupos = screen.container.queryAll((el) => el.props.role === 'radiogroup');
    expect(grupos.map((g) => g.props['aria-label'] ?? g.props.accessibilityLabel)).toEqual([
      'Urgência',
      'Prazo',
    ]);
    expect(opcoesDeCertificacao()[0]).toEqual({ value: '', label: 'Nenhuma' });
    expect(seletorCertificacao().props.selectedIndex).toBe(0);
    expect(screen.getByRole('link', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(botaoPublicar()).toBeOnTheScreen();
  });

  it('a prévia "Como o motorista vai ver" acompanha o que foi digitado', async () => {
    await abrir();

    expect(screen.getByText('Como o motorista vai ver')).toBeOnTheScreen();
    await preencherTudo();
    await fireEvent.press(screen.getByRole('radio', { name: 'Crítico' }));

    const previa = screen.container.queryAll(
      (el) => el.props.role === 'group' && el.props['aria-label'] === 'Prévia da carga',
    );
    expect(previa).toHaveLength(1);
    expect(screen.getByText('Produtos inflamáveis')).toBeOnTheScreen();
    expect(screen.getAllByText(/Uberlândia - MG/).length).toBeGreaterThan(0);
  });
});

describe('envio (MVP-08)', () => {
  it('envia o corpo exato: números como number, certificação null, expira_em ISO no futuro', async () => {
    const envios = capturarEnvios();
    await abrir();
    await preencherTudo();
    const antes = Date.now();
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    const corpo = envios[0]!;
    expect(Object.keys(corpo).sort()).toEqual(
      [
        'certificacao_requerida_id',
        'destino',
        'expira_em',
        'origem',
        'peso_kg',
        'tipo_carga',
        'urgencia',
        'valor_oferecido',
      ].sort(),
    );
    expect(corpo.tipo_carga).toBe('Produtos inflamáveis');
    expect(corpo.peso_kg).toBe(8000);
    expect(typeof corpo.peso_kg).toBe('number');
    expect(corpo.valor_oferecido).toBe(3500);
    expect(typeof corpo.valor_oferecido).toBe('number');
    expect(corpo.urgencia).toBe('normal');
    expect(corpo.certificacao_requerida_id).toBeNull();
    const origem = corpo.origem as Record<string, unknown>;
    const destino = corpo.destino as Record<string, unknown>;
    expect(Object.keys(origem).sort()).toEqual(['lat', 'lng']);
    expect(typeof origem.lat).toBe('number');
    expect(typeof destino.lng).toBe('number');
    expect(origem).not.toEqual(destino);
    const expiraEm = String(corpo.expira_em);
    expect(new Date(expiraEm).toISOString()).toBe(expiraEm);
    const horas = (new Date(expiraEm).getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(23.9);
    expect(horas).toBeLessThan(24.1);
  });

  it('envia a urgência, a certificação e o prazo escolhidos', async () => {
    const envios = capturarEnvios();
    await abrir();
    await preencherTudo();
    await fireEvent.press(screen.getByRole('radio', { name: 'Crítico' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Em 6 horas' }));
    await fireEvent(seletorCertificacao(), 'change', {
      nativeEvent: { newValue: certificacoesMock[0]!.id, newIndex: 1 },
    });
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    const corpo = envios[0]!;
    expect(corpo.urgencia).toBe('critico');
    expect(corpo.certificacao_requerida_id).toBe(certificacoesMock[0]!.id);
    const horas = (new Date(String(corpo.expira_em)).getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(5.9);
    expect(horas).toBeLessThan(6.1);
  });

  it('201 abre "Minhas cargas" e anuncia "Carga publicada"', async () => {
    capturarEnvios();
    await abrir();
    await preencherTudo();
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(screen.getByText('Lista de cargas')).toBeOnTheScreen();
    expect(anunciarMock).toHaveBeenCalledWith('Carga publicada');
  });

  it('clique duplo e Enter repetido enviam uma requisição só (CT-01)', async () => {
    const envios = capturarEnvios();
    await abrir();
    await preencherTudo();
    const botao = botaoPublicar();
    await fireEvent.press(botao);
    await fireEvent.press(botao);

    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(envios).toHaveLength(1);
  });
});

describe('validação local (D-PO-14)', () => {
  it('campos vazios: resumo com os erros, foco no resumo e nada é enviado', async () => {
    const envios = capturarEnvios();
    await abrir();
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('Corrija 5 campos para continuar.')).toBeOnTheScreen(),
    );
    expect(alertas().length).toBeGreaterThan(0);
    expect(screen.getByText('Escolha a cidade de origem.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha a cidade de destino.')).toBeOnTheScreen();
    expect(envios).toHaveLength(0);
    expect(caminho()).toBe('/empresa/cargas/nova');
    expect(moverFocoMock).toHaveBeenCalled();
  });

  it('peso e valor precisam ser maiores que zero', async () => {
    const envios = capturarEnvios();
    await abrir();
    await preencherTudo();
    await fireEvent.changeText(screen.getByLabelText('Peso (kg)'), '0');
    await fireEvent.changeText(screen.getByLabelText('Valor oferecido (R$)'), 'abc');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getAllByText('Informe um número maior que zero.')).toHaveLength(2),
    );
    expect(envios).toHaveLength(0);
  });

  it('tipo de carga aceita até 80 caracteres', async () => {
    const envios = capturarEnvios();
    await abrir();
    await preencherTudo();
    await fireEvent.changeText(screen.getByLabelText('Tipo de carga'), 'x'.repeat(81));
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(screen.getByText('Use no máximo 80 caracteres.')).toBeOnTheScreen());
    expect(envios).toHaveLength(0);
  });

  it('origem igual ao destino avisa antes de enviar e some ao trocar o destino', async () => {
    const envios = capturarEnvios();
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Tipo de carga'), 'Grãos');
    await escolherCidade('Origem', 'uberl', 'Uberlândia - MG');
    await escolherCidade('Destino', 'uberl', 'Uberlândia - MG');
    await fireEvent.changeText(screen.getByLabelText('Peso (kg)'), '100');
    await fireEvent.changeText(screen.getByLabelText('Valor oferecido (R$)'), '500');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(
        screen.getAllByText('Origem e destino precisam ser diferentes').length,
      ).toBeGreaterThan(0),
    );
    expect(envios).toHaveLength(0);

    await fireEvent.press(screen.getAllByRole('button', { name: 'Trocar' })[1]!);
    await escolherCidade('Destino', 'ubera', 'Uberaba - MG');
    await fireEvent.press(botaoPublicar());
    await waitFor(() => expect(envios).toHaveLength(1));
  });
});

describe('erros da API', () => {
  it('400 "certificacao_requerida_id …" aparece junto do campo de certificação (CT-03)', async () => {
    servidor.use(
      http.post(urlMock('/cargas'), () =>
        respostaErros(400, ['certificacao_requerida_id não corresponde a nenhuma certificação']),
      ),
    );
    await abrir();
    await preencherTudo();
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(
        screen.getByText('certificacao_requerida_id não corresponde a nenhuma certificação'),
      ).toBeOnTheScreen(),
    );
    expect(seletorCertificacao().props.accessibilityHint).toContain(
      'certificacao_requerida_id não corresponde',
    );
    expect(caminho()).toBe('/empresa/cargas/nova');
    // O que foi digitado continua lá.
    expect(screen.getByLabelText('Peso (kg)').props.value).toBe('8000');
    expect(screen.getByLabelText('Tipo de carga').props.value).toBe('Produtos inflamáveis');
  });

  it('400 de outros campos vai ao campo certo; sem campo, ao resumo', async () => {
    servidor.use(
      http.post(urlMock('/cargas'), () =>
        respostaErros(400, [
          'peso_kg deve ser um número maior que zero',
          'algo estranho aconteceu',
        ]),
      ),
    );
    await abrir();
    await preencherTudo();
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('peso_kg deve ser um número maior que zero')).toBeOnTheScreen(),
    );
    expect(screen.getByText('algo estranho aconteceu')).toBeOnTheScreen();
  });

  it('403 mostra a mensagem da API no resumo', async () => {
    servidor.use(
      http.post(urlMock('/cargas'), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrir();
    await preencherTudo();
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('acesso negado para este tipo de usuário')).toBeOnTheScreen(),
    );
    expect(caminho()).toBe('/empresa/cargas/nova');
  });

  it('500 com HTML vira o texto padrão com "Tentar de novo", e tentar de novo publica', async () => {
    let chamadas = 0;
    servidor.use(
      http.post(urlMock('/cargas'), () => {
        chamadas += 1;
        return chamadas === 1
          ? respostaHtml(500)
          : HttpResponse.json({ carga: { id: 'nova' } }, { status: 201 });
      }),
    );
    await abrir();
    await preencherTudo();
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    expect(screen.queryByText(/Cannot|Internal Server Error/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(caminho()).toBe('/empresa/cargas'));
    expect(chamadas).toBe(2);
  });
});

describe('certificações com erro (MVP-08)', () => {
  /** `GET /certificacoes` falha nas `falhas` primeiras chamadas (a consulta repete uma vez). */
  function certificacoesQuebradas(falhas: number) {
    let tentativas = 0;
    servidor.use(
      http.get(urlMock('/certificacoes'), () => {
        tentativas += 1;
        return tentativas <= falhas
          ? respostaHtml(500)
          : HttpResponse.json({ certificacoes: certificacoesMock });
      }),
    );
  }

  it('mostra o erro junto do campo; o resto do formulário segue utilizável', async () => {
    certificacoesQuebradas(Infinity);
    const envios = capturarEnvios();
    await abrir({ aguardarCertificacoes: false });

    await waitFor(() =>
      expect(screen.getByText('Não foi possível carregar as certificações.')).toBeOnTheScreen(),
    );
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(anunciarMock).toHaveBeenCalledWith('Não foi possível carregar as certificações.');
    // Dá para publicar com "Nenhuma".
    await preencherTudo();
    await fireEvent.press(botaoPublicar());
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]!.certificacao_requerida_id).toBeNull();
  });

  it('"Tentar de novo" busca as certificações outra vez e o erro some', async () => {
    certificacoesQuebradas(1);
    await abrir({ aguardarCertificacoes: false });
    await waitFor(() =>
      expect(screen.getByText('Não foi possível carregar as certificações.')).toBeOnTheScreen(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(opcoesDeCertificacao()).toHaveLength(certificacoesMock.length + 1));
    expect(screen.queryByText('Não foi possível carregar as certificações.')).toBeNull();
  });
});
