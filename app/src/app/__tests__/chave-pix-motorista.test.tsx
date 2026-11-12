// Chave Pix do motorista (card 047): tela real, API de mock com estado (MSW). Estado vazio, cadastro
// com normalização, 400 da API no campo, teclado por tipo, troca, falhas de leitura (403, 404, 500) e 401.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { configure, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { CascaContext } from '@/components/organisms/useCasca';
import { anunciar } from '@/lib/a11y';
import { MENSAGEM_FALHA } from '@/lib/erros';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { reiniciarChavePixMock } from '../../../mocks/handlers/chavePix';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro } from '../../../mocks/respostas';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import ChavePixMotorista from '../motorista/chave-pix';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoChavePixMotorista.carregar', () => ({
  carregarCorpoChavePixMotorista: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoChavePixMotorista')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const anunciado = jest.mocked(anunciar);

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <ChavePixMotorista />
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
    { _layout: Raiz, 'motorista/chave-pix': Tela },
    { initialUrl: '/motorista/chave-pix' },
  );
  return cliente;
}

/** Espera o formulário (chega por React.lazy e por uma leitura). */
async function abrirPronto(aoSessaoExpirada = () => undefined) {
  const cliente = await abrir(aoSessaoExpirada);
  await screen.findByRole('button', { name: 'Salvar chave Pix' });
  return cliente;
}

// View não é elemento de acessibilidade para o RNTL: papéis de View saem por `props.role`.
const comPapel = (papel: string) => screen.container.queryAll((el) => el.props.role === papel);

const seletor = () => screen.getByLabelText('Tipo da chave');
const campoChave = () => screen.getByLabelText('Chave Pix');
const botaoSalvar = () => screen.getByRole('button', { name: 'Salvar chave Pix' });

// Posição de cada valor no seletor (a primeira linha é "Escolha o tipo da chave").
const INDICE = { cpf: 1, cnpj: 2, email: 3, telefone: 4, aleatoria: 5 } as const;

async function escolherTipo(tipo: keyof typeof INDICE) {
  await fireEvent(seletor(), 'change', { nativeEvent: { newValue: tipo, newIndex: INDICE[tipo] } });
}

async function cadastrar(tipo: keyof typeof INDICE, chave: string) {
  await escolherTipo(tipo);
  await fireEvent.changeText(campoChave(), chave);
  await fireEvent.press(botaoSalvar());
}

beforeEach(() => {
  reiniciarChavePixMock();
  anunciado.mockClear();
});

afterEach(() => sairDoMock());

describe('leitura', () => {
  it('h1, estado "Nenhuma chave cadastrada" e o formulário com os dois campos rotulados', async () => {
    await abrirPronto();

    expect(screen.getByRole('heading', { name: 'Chave Pix' }).props['aria-level']).toBe(1);
    expect(screen.getByText('Nenhuma chave cadastrada')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Cadastrar chave Pix' })).toBeOnTheScreen();
    expect(seletor()).toBeOnTheScreen();
    expect(campoChave()).toBeOnTheScreen();
  });

  it('com chave guardada mostra o tipo em texto e a chave inteira, e o formulário vem preenchido', async () => {
    servidor.use(
      http.get(urlMock('/motorista/chave-pix'), () =>
        HttpResponse.json({ chave_pix: '52998224725', tipo_chave_pix: 'cpf' }),
      ),
    );
    await abrirPronto();

    expect(screen.getByText('CPF')).toBeOnTheScreen();
    expect(screen.getAllByText('52998224725').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nenhuma chave cadastrada')).not.toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Trocar chave Pix' })).toBeOnTheScreen();
    expect(campoChave().props.value).toBe('52998224725');
  });

  it('enquanto carrega mostra "Carregando sua chave Pix…"', async () => {
    servidor.use(http.get(urlMock('/motorista/chave-pix'), () => new Promise(() => undefined)));
    await abrir();
    expect((await screen.findAllByText('Carregando sua chave Pix…')).length).toBeGreaterThan(0);
  });

  it('falha 500: mensagem padrão e "Tentar de novo" refaz a leitura', async () => {
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/motorista/chave-pix'), () => {
        leituras += 1;
        return leituras === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ chave_pix: null, tipo_chave_pix: null });
      }),
    );
    await abrir();
    expect(await screen.findByText(MENSAGEM_FALHA)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Nenhuma chave cadastrada')).toBeOnTheScreen();
    expect(leituras).toBe(2);
  });

  it('403 e 404: a mensagem da API aparece em EstadoErro', async () => {
    servidor.use(
      http.get(urlMock('/motorista/chave-pix'), () =>
        respostaErro(404, 'perfil de motorista não encontrado'),
      ),
    );
    await abrir();
    expect(await screen.findByText('perfil de motorista não encontrado')).toBeOnTheScreen();
    expect(comPapel('alert').length).toBeGreaterThan(0);
  });

  it('401 chama o encerramento da sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.get(urlMock('/motorista/chave-pix'), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrir(aoSessaoExpirada);
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});

describe('cadastro', () => {
  it('CPF com pontuação: envia o corpo exato, mostra a chave normalizada, anuncia e limpa o aviso de vazio', async () => {
    const envios: unknown[] = [];
    servidor.use(
      http.put(urlMock('/motorista/chave-pix'), async ({ request }) => {
        envios.push(await request.json());
        return HttpResponse.json({ chave_pix: '52998224725', tipo_chave_pix: 'cpf' });
      }),
    );
    await abrirPronto();
    await cadastrar('cpf', '529.982.247-25');

    expect(await screen.findByText('Chave Pix salva.')).toBeOnTheScreen();
    expect(envios).toEqual([{ tipo_chave_pix: 'cpf', chave_pix: '529.982.247-25' }]);
    expect(screen.getAllByText('52998224725').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nenhuma chave cadastrada')).not.toBeOnTheScreen();
    expect(anunciado).toHaveBeenCalledWith('Chave Pix salva.');
    // O formulário passa a mostrar a chave normalizada e vira "Trocar".
    expect(screen.getByRole('heading', { name: 'Trocar chave Pix' })).toBeOnTheScreen();
    expect(campoChave().props.value).toBe('52998224725');
  });

  it('e-mail em maiúsculas volta normalizado em minúsculas (mock com estado)', async () => {
    await abrirPronto();
    await cadastrar('email', 'Joao@Exemplo.COM');
    expect(await screen.findByText('Chave Pix salva.')).toBeOnTheScreen();
    expect(screen.getAllByText('joao@exemplo.com').length).toBeGreaterThan(0);
    expect(screen.getByText('E-mail')).toBeOnTheScreen();
  });

  it('telefone com +55 volta com 11 dígitos', async () => {
    await abrirPronto();
    await cadastrar('telefone', '+55 34 99999-1234');
    expect(await screen.findByText('Chave Pix salva.')).toBeOnTheScreen();
    expect(screen.getAllByText('34999991234').length).toBeGreaterThan(0);
  });

  it('a chave guardada volta numa nova abertura da tela (GET devolve a gravada)', async () => {
    await abrirPronto();
    await cadastrar('cnpj', '11.222.333/0001-81');
    await screen.findByText('Chave Pix salva.');

    await abrirPronto();
    expect(screen.getAllByText('11222333000181').length).toBeGreaterThan(0);
    expect(screen.getByText('CNPJ')).toBeOnTheScreen();
  });

  it('400: a mensagem da API vai ao campo da chave, o resumo lista o erro e nada é salvo', async () => {
    await abrirPronto();
    await cadastrar('cpf', '123.456.789-01');

    expect(
      (await screen.findAllByText('chave_pix inválida para o tipo cpf')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Chave Pix salva.')).not.toBeOnTheScreen();
    expect(screen.getByText('Nenhuma chave cadastrada')).toBeOnTheScreen();
    expect(anunciado).not.toHaveBeenCalledWith('Chave Pix salva.');
    expect(
      campoChave().props['aria-invalid'] ?? campoChave().props.accessibilityState,
    ).toBeTruthy();
  });

  it('formulário vazio: erros locais, sem requisição', async () => {
    let puts = 0;
    servidor.use(
      http.put(urlMock('/motorista/chave-pix'), () => {
        puts += 1;
        return HttpResponse.json({ chave_pix: null, tipo_chave_pix: null });
      }),
    );
    await abrirPronto();
    await fireEvent.press(botaoSalvar());

    expect((await screen.findAllByText('Escolha o tipo da chave.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Informe a chave Pix.').length).toBeGreaterThan(0);
    expect(puts).toBe(0);
  });

  it('500 no envio: mensagem padrão no resumo e o formulário continua preenchido', async () => {
    servidor.use(
      http.put(urlMock('/motorista/chave-pix'), () => new HttpResponse(null, { status: 500 })),
    );
    await abrirPronto();
    await cadastrar('email', 'a@b.com');
    expect((await screen.findAllByText(MENSAGEM_FALHA)).length).toBeGreaterThan(0);
    expect(campoChave().props.value).toBe('a@b.com');
  });

  it('401 no envio encerra a sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    servidor.use(
      http.put(urlMock('/motorista/chave-pix'), () =>
        respostaErro(401, 'token inválido ou expirado'),
      ),
    );
    await abrirPronto(aoSessaoExpirada);
    await cadastrar('email', 'a@b.com');
    await waitFor(() => expect(aoSessaoExpirada).toHaveBeenCalled());
  });
});

describe('campo da chave por tipo', () => {
  it('telefone pede teclado numérico de telefone; e-mail, teclado de e-mail; CPF, numérico', async () => {
    await abrirPronto();

    await escolherTipo('telefone');
    await waitFor(() => expect(campoChave().props.inputMode).toBe('tel'));
    expect(campoChave().props.autoComplete).toBe('tel');

    await escolherTipo('email');
    await waitFor(() => expect(campoChave().props.inputMode).toBe('email'));
    expect(campoChave().props.autoComplete).toBe('email');

    await escolherTipo('cpf');
    await waitFor(() => expect(campoChave().props.inputMode).toBe('numeric'));
    expect(campoChave().props.autoComplete).toBe('off');

    await escolherTipo('aleatoria');
    await waitFor(() => expect(campoChave().props.inputMode).toBe('text'));
  });
});
