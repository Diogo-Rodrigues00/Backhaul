// Publicar disponibilidade (card 023, MVP-10, CT-01/03, D-PO-02/03/14/16). Tela real, o provider da
// disponibilidade ativa de verdade e a API de mock (MSW).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';
import { Text, useWindowDimensions } from 'react-native';

import { anunciar, moverFoco } from '@/lib/a11y';
import { CHAVES, gravar, apagar } from '@/lib/armazenamento';
import { lerEscolhaSalva } from '@/lib/disponibilidadeAtiva';
import { MENSAGEM_FALHA } from '@/lib/erros';
import { CascaContext } from '@/components/organisms/useCasca';
import { DisponibilidadeAtivaProvider } from '@/state/disponibilidade-ativa/DisponibilidadeAtivaProvider';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { disponibilidadePublicadaMock } from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaErros, respostaHtml } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import PublicarDisponibilidade from '../motorista/disponibilidades/nova';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));
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
// O Jest não executa import() dinâmico: o formulário (React.lazy) e o expo-location vêm de módulos falsos.
jest.mock('@/telas/FormularioPublicarDisponibilidade.carregar', () => ({
  carregarFormularioPublicarDisponibilidade: () =>
    Promise.resolve(jest.requireActual('@/telas/FormularioPublicarDisponibilidade')),
}));
const mockPermissao = jest.fn();
const mockPosicao = jest.fn();
jest.mock('@/components/organisms/SeletorLocal.expoLocation', () => ({
  carregarExpoLocation: () =>
    Promise.resolve({
      requestForegroundPermissionsAsync: (...args: unknown[]) => mockPermissao(...args),
      getCurrentPositionAsync: (...args: unknown[]) => mockPosicao(...args),
      Accuracy: { Balanced: 3 },
    }),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));
const anunciarMock = jest.mocked(anunciar);
const moverFocoMock = jest.mocked(moverFoco);
const gravarMock = jest.mocked(gravar);

function Sonda() {
  return <Text testID="rota">{usePathname()}</Text>;
}

/** Faz o papel de "Cargas próximas" (024): mostra a ativa que o provider entrega. */
function CargasProximasProvisoria() {
  const { ativa } = useDisponibilidadeAtiva();
  return <Text testID="ativa">{ativa ? ativa.id : 'nenhuma'}</Text>;
}

function LayoutMotorista() {
  return (
    <DisponibilidadeAtivaProvider>
      <Slot />
    </DisponibilidadeAtivaProvider>
  );
}

async function abrir() {
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
      'motorista/_layout': LayoutMotorista,
      'motorista/cargas': CargasProximasProvisoria,
      'motorista/disponibilidades/index': () => <Text>Minhas disponibilidades</Text>,
      'motorista/disponibilidades/nova': PublicarDisponibilidade,
    },
    { initialUrl: '/motorista/disponibilidades/nova' },
  );
  // O formulário chega por React.lazy, depois da primeira renderização.
  await screen.findByRole('button', { name: /^Publicar disponibilidade|Publicando/ });
}

const caminho = () => screen.getByTestId('rota').props.children as string;
const botaoPublicar = () =>
  screen.getByRole('button', { name: /^Publicar disponibilidade|Publicando/ });
const alertas = () => screen.container.queryAll((el) => el.props.role === 'alert');
const campoRaio = () => screen.getByLabelText('Raio de busca (km)');

async function escolherCidade(busca: string, nome: string) {
  await fireEvent.changeText(screen.getByLabelText('Ou escolha a cidade'), busca);
  await fireEvent.press(screen.getByRole('button', { name: `Escolher ${nome}` }));
}

type CorpoEnviado = Record<string, unknown>;

/** Registra os corpos de `POST /disponibilidades` e responde 201 (com um pequeno atraso). */
function capturarEnvios() {
  const envios: CorpoEnviado[] = [];
  servidor.use(
    http.post(urlMock('/disponibilidades'), async ({ request }) => {
      const corpo = (await request.json()) as CorpoEnviado;
      envios.push(corpo);
      await delay(30);
      return HttpResponse.json(
        {
          disponibilidade: {
            ...disponibilidadePublicadaMock,
            id: 'nova-disp',
            local: corpo.local,
            raio_busca_km: corpo.raio_busca_km ?? 50,
            urgencia: corpo.urgencia ?? 'normal',
            expira_em: corpo.expira_em,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),
  );
  return envios;
}

beforeEach(async () => {
  // Janela larga: a lateral "Como funciona" só aparece acima de 960 px.
  jest
    .mocked(useWindowDimensions)
    .mockReturnValue({ width: 1200, height: 900, scale: 2, fontScale: 1 });
  entrarComoMock('mock-motorista');
  // O backend ainda não tem GET /disponibilidades/minhas (404): vale o plano B do provider, em que a
  // publicada neste aparelho é a única da lista.
  servidor.use(http.get(urlMock('/disponibilidades/minhas'), () => respostaHtml(404)));
  await apagar(CHAVES.disponibilidadeAtiva);
  anunciarMock.mockClear();
  moverFocoMock.mockClear();
  gravarMock.mockClear();
  mockPermissao.mockReset();
  mockPosicao.mockReset();
});

afterEach(() => sairDoMock());

describe('a tela', () => {
  it('mostra o h1, o formulário nomeado, os campos e os padrões (MVP-10)', async () => {
    await abrir();

    expect(
      screen.getByRole('heading', { name: 'Publicar disponibilidade' }).props['aria-level'],
    ).toBe(1);
    const formularios = screen.container.queryAll(
      (el) => el.props.role === 'form' && el.props['aria-label'] === 'Publicar disponibilidade',
    );
    expect(formularios).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Ou escolha a cidade')).toBeOnTheScreen();
    expect(campoRaio().props.value).toBe('50');
    expect(screen.getByRole('radio', { name: 'Normal', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Em 24 horas', checked: true })).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3 + 5);
    const grupos = screen.container.queryAll((el) => el.props.role === 'radiogroup');
    expect(grupos.map((g) => g.props['aria-label'] ?? g.props.accessibilityLabel)).toEqual([
      'Urgência',
      'Prazo',
    ]);
    expect(screen.getByRole('link', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(screen.getByText('Como funciona')).toBeOnTheScreen();
  });
});

describe('envio (MVP-10)', () => {
  it('envia o corpo exato: coordenadas e raio como number, urgência e expira_em ISO no futuro', async () => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    const antes = Date.now();
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    const corpo = envios[0]!;
    expect(Object.keys(corpo).sort()).toEqual(['expira_em', 'local', 'raio_busca_km', 'urgencia']);
    const local = corpo.local as Record<string, unknown>;
    expect(Object.keys(local).sort()).toEqual(['lat', 'lng']);
    expect(typeof local.lat).toBe('number');
    expect(typeof local.lng).toBe('number');
    expect(corpo.raio_busca_km).toBe(50);
    expect(typeof corpo.raio_busca_km).toBe('number');
    expect(corpo.urgencia).toBe('normal');
    const expiraEm = String(corpo.expira_em);
    expect(new Date(expiraEm).toISOString()).toBe(expiraEm);
    const horas = (new Date(expiraEm).getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(23.9);
    expect(horas).toBeLessThan(24.1);
  });

  it('envia o raio, a urgência e o prazo escolhidos (vírgula decimal vira número)', async () => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.changeText(campoRaio(), '80,5');
    await fireEvent.press(screen.getByRole('radio', { name: 'Crítico' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Em 6 horas' }));
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    const corpo = envios[0]!;
    expect(corpo.raio_busca_km).toBe(80.5);
    expect(corpo.urgencia).toBe('critico');
    const horas = (new Date(String(corpo.expira_em)).getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(5.9);
    expect(horas).toBeLessThan(6.1);
  });

  it('com "Usar minha localização" envia as coordenadas do aparelho como número (D-PO-16)', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockResolvedValue({ coords: { latitude: -18.95, longitude: -48.3 } });
    const envios = capturarEnvios();
    await abrir();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText(/Selecionado: Minha localização atual/)).toBeOnTheScreen();
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]!.local).toEqual({ lat: -18.95, lng: -48.3 });
  });

  it('GPS negado não bloqueia o envio: a cidade escolhida na lista publica normalmente', async () => {
    mockPermissao.mockResolvedValue({ status: 'denied' });
    const envios = capturarEnvios();
    await abrir();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText('Não foi possível usar sua localização.')).toBeOnTheScreen();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
  });

  it('201: a nova vira a ativa, fica guardada no aparelho, anuncia e abre "Cargas próximas"', async () => {
    capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    expect(anunciarMock).toHaveBeenCalledWith('Disponibilidade publicada');
    // "Cargas próximas" já lê a ativa do provider (a recém-publicada).
    await waitFor(() => expect(screen.getByTestId('ativa').props.children).toBe('nova-disp'));
    // Guardada no aparelho com a cópia inteira (plano B, sem GET /disponibilidades/minhas).
    const gravacao = gravarMock.mock.calls.find(([chave]) => chave === CHAVES.disponibilidadeAtiva);
    const escolha = lerEscolhaSalva(gravacao![1]);
    expect(escolha?.id).toBe('nova-disp');
    expect(escolha?.publicada?.raio_busca_km).toBe(50);
  });

  it('clique duplo envia uma requisição só (CT-01)', async () => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    const botao = botaoPublicar();
    await fireEvent.press(botao);
    await fireEvent.press(botao);

    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    expect(envios).toHaveLength(1);
  });
});

describe('validação local (D-PO-14)', () => {
  it('sem local: resumo com o erro, foco no resumo e nada é enviado', async () => {
    const envios = capturarEnvios();
    await abrir();
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('Corrija 1 campo para continuar.')).toBeOnTheScreen(),
    );
    expect(alertas().length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Escolha onde você está ou use sua localização.').length,
    ).toBeGreaterThan(0);
    expect(envios).toHaveLength(0);
    expect(caminho()).toBe('/motorista/disponibilidades/nova');
    expect(moverFocoMock).toHaveBeenCalled();
  });

  it('raio acima de 500 é bloqueado antes de enviar', async () => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.changeText(campoRaio(), '501');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(
        screen.getAllByText('Informe um número maior que zero e até 500.').length,
      ).toBeGreaterThan(0),
    );
    expect(envios).toHaveLength(0);
  });

  it.each(['0', '-5', 'abc', ''])('raio "%s" é recusado', async (valor) => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.changeText(campoRaio(), valor);
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(alertas().length).toBeGreaterThan(0));
    expect(envios).toHaveLength(0);
  });

  it('raio 500 (o limite) é aceito', async () => {
    const envios = capturarEnvios();
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.changeText(campoRaio(), '500');
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]!.raio_busca_km).toBe(500);
  });
});

describe('erros da API', () => {
  it('400 vai ao campo certo (raio) e o que foi digitado continua lá (CT-03)', async () => {
    servidor.use(
      http.post(urlMock('/disponibilidades'), () =>
        respostaErros(400, [
          'raio_busca_km deve ser um número maior que zero e até 500',
          'algo estranho aconteceu',
        ]),
      ),
    );
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.changeText(campoRaio(), '120');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(
        screen.getByText('raio_busca_km deve ser um número maior que zero e até 500'),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByText('algo estranho aconteceu')).toBeOnTheScreen();
    expect(caminho()).toBe('/motorista/disponibilidades/nova');
    expect(campoRaio().props.value).toBe('120');
    expect(screen.getByText(/Selecionado: Uberlândia - MG/)).toBeOnTheScreen();
  });

  it('400 do local aparece junto do seletor', async () => {
    servidor.use(
      http.post(urlMock('/disponibilidades'), () =>
        respostaErros(400, ['local.lat deve ser um número entre -90 e 90']),
      ),
    );
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('local.lat deve ser um número entre -90 e 90')).toBeOnTheScreen(),
    );
  });

  it('403 mostra a mensagem da API no resumo e não publica', async () => {
    servidor.use(
      http.post(urlMock('/disponibilidades'), () =>
        respostaErro(403, 'acesso negado para este tipo de usuário'),
      ),
    );
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('acesso negado para este tipo de usuário')).toBeOnTheScreen(),
    );
    expect(caminho()).toBe('/motorista/disponibilidades/nova');
    expect(anunciarMock).not.toHaveBeenCalledWith('Disponibilidade publicada');
  });

  it('404 (motorista sem perfil) mostra a mensagem da API no resumo e não publica', async () => {
    servidor.use(
      http.post(urlMock('/disponibilidades'), () =>
        respostaErro(404, 'perfil de motorista não encontrado'),
      ),
    );
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() =>
      expect(screen.getByText('perfil de motorista não encontrado')).toBeOnTheScreen(),
    );
    expect(caminho()).toBe('/motorista/disponibilidades/nova');
    expect(anunciarMock).not.toHaveBeenCalledWith('Disponibilidade publicada');
  });

  it('500 com HTML vira o texto padrão com "Tentar de novo", e tentar de novo publica', async () => {
    let chamadas = 0;
    servidor.use(
      http.post(urlMock('/disponibilidades'), () => {
        chamadas += 1;
        return chamadas === 1
          ? respostaHtml(500)
          : HttpResponse.json(
              { disponibilidade: { ...disponibilidadePublicadaMock, id: 'nova-disp' } },
              { status: 201 },
            );
      }),
    );
    await abrir();
    await escolherCidade('uberl', 'Uberlândia - MG');
    await fireEvent.press(botaoPublicar());

    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    expect(screen.queryByText(/Cannot|Internal Server Error/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(caminho()).toBe('/motorista/cargas'));
    expect(chamadas).toBe(2);
  });
});
