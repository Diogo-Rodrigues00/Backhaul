import { http, HttpResponse } from 'msw';

import { entrarComoMock, sairDoMock } from '../../mocks/utils-teste';
import { servidor, urlMock } from '../../mocks/node';
import {
  respostaErro,
  respostaErros,
  respostaHtml,
  respostaQueNaoChega,
  respostaVazia,
} from '../../mocks/respostas';
import { ErroApi, MENSAGEM_FALHA, MENSAGEM_SESSAO_EXPIRADA } from '@/lib/erros';

import { configurarCliente, montarConsulta, requisitar } from './cliente';
import { obterBaseUrl, reiniciarConfig } from './config';

async function capturar(promessa: Promise<unknown>): Promise<ErroApi> {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof ErroApi) return erro;
    throw erro;
  }
  throw new Error('a requisição deveria ter falhado');
}

beforeEach(() => sairDoMock());

describe('requisitar: sucesso e cabeçalhos', () => {
  it('devolve o JSON da resposta', async () => {
    const dados = await requisitar<{ status: string }>('GET', '/saude', { autenticado: false });
    expect(dados).toEqual({ status: 'ok', banco: 'conectado' });
  });

  it('envia o Bearer e o corpo JSON', async () => {
    let cabecalhos: Headers | undefined;
    let corpo: unknown;
    servidor.use(
      http.post(urlMock('/eco'), async ({ request }) => {
        cabecalhos = request.headers;
        corpo = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    entrarComoMock('mock-empresa');

    await requisitar('POST', '/eco', { corpo: { a: 1 } });

    expect(cabecalhos?.get('Authorization')).toBe('Bearer mock-empresa');
    expect(cabecalhos?.get('Content-Type')).toBe('application/json');
    expect(corpo).toEqual({ a: 1 });
  });

  it('não envia o Bearer quando autenticado é falso', async () => {
    let autorizacao: string | null = 'x';
    servidor.use(
      http.get(urlMock('/eco'), ({ request }) => {
        autorizacao = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );
    entrarComoMock('mock-empresa');

    await requisitar('GET', '/eco', { autenticado: false });

    expect(autorizacao).toBeNull();
  });
});

describe('requisitar: erros (CT-03)', () => {
  const rota = '/falha';

  function responder(resposta: () => Response | Promise<Response> | Promise<never>) {
    servidor.use(http.get(urlMock(rota), resposta));
  }

  it('400 com erros vira validacao', async () => {
    responder(() => respostaErros(400, ['email inválido', 'cpf deve ter 11 dígitos']));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('validacao');
    expect(erro.status).toBe(400);
    expect(erro.mensagens).toEqual(['email inválido', 'cpf deve ter 11 dígitos']);
  });

  it('400 com erro (JSON inválido no corpo) vira mensagem', async () => {
    responder(() => respostaErro(400, 'JSON inválido no corpo da requisição'));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('mensagem');
    expect(erro.mensagens).toEqual(['JSON inválido no corpo da requisição']);
  });

  it('401 autenticado vira sessao com texto fixo', async () => {
    responder(() => respostaErro(401, 'token inválido ou expirado'));
    entrarComoMock('mock-empresa');
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('sessao');
    expect(erro.status).toBe(401);
    expect(erro.mensagens).toEqual([MENSAGEM_SESSAO_EXPIRADA]);
  });

  it.each([
    [403, 'acesso negado para este tipo de usuário'],
    [404, 'carga não encontrada'],
    [409, 'carga não está mais aberta'],
  ])('%i com erro vira mensagem da API', async (status, texto) => {
    responder(() => respostaErro(status, texto));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('mensagem');
    expect(erro.status).toBe(status);
    expect(erro.mensagens).toEqual([texto]);
  });

  it('500 JSON vira falha com a mensagem fixa (não expõe "erro interno")', async () => {
    responder(() => respostaErro(500, 'erro interno'));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(500);
    expect(erro.mensagens).toEqual([MENSAGEM_FALHA]);
  });

  it('500 HTML do Express vira falha sem expor o HTML', async () => {
    responder(() => respostaHtml(500));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.mensagens).toEqual([MENSAGEM_FALHA]);
    expect(JSON.stringify(erro.mensagens)).not.toContain('html');
  });

  it('404 HTML (rota inexistente) vira falha', async () => {
    responder(() => respostaHtml(404));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(404);
  });

  it('corpo vazio num erro vira falha', async () => {
    responder(() => respostaVazia(502));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(502);
  });

  it('4xx com JSON sem erro nem erros vira falha', async () => {
    responder(() => HttpResponse.json({ outra: 'coisa' }, { status: 409 }));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(409);
  });

  it('200 com corpo que não é JSON vira falha', async () => {
    responder(() => new HttpResponse('<html></html>', { status: 200 }));
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBe(200);
  });

  it('falha de rede vira falha sem status', async () => {
    responder(() => HttpResponse.error());
    const erro = await capturar(requisitar('GET', rota));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBeNull();
    expect(erro.mensagens).toEqual([MENSAGEM_FALHA]);
  });

  it('timeout vira falha sem status', async () => {
    responder(() => respostaQueNaoChega());
    const erro = await capturar(requisitar('GET', rota, { timeoutMs: 30 }));
    expect(erro.tipo).toBe('falha');
    expect(erro.status).toBeNull();
  });
});

describe('requisitar: 401 e sessão (CT-04, D-PO-11)', () => {
  it('três requisições simultâneas com 401 avisam a sessão uma única vez', async () => {
    servidor.use(
      http.get(urlMock('/protegida'), () => respostaErro(401, 'token inválido ou expirado')),
    );
    const aoSessaoExpirada = jest.fn();
    entrarComoMock('mock-empresa', aoSessaoExpirada);

    const resultados = await Promise.allSettled([
      requisitar('GET', '/protegida'),
      requisitar('GET', '/protegida'),
      requisitar('GET', '/protegida'),
    ]);

    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
    expect(aoSessaoExpirada).toHaveBeenCalledTimes(1);
  });

  it('avisa de novo depois de configurarCliente (novo login)', async () => {
    servidor.use(
      http.get(urlMock('/protegida'), () => respostaErro(401, 'token inválido ou expirado')),
    );
    const aoSessaoExpirada = jest.fn();
    entrarComoMock('mock-empresa', aoSessaoExpirada);
    await capturar(requisitar('GET', '/protegida'));
    entrarComoMock('mock-empresa', aoSessaoExpirada);
    await capturar(requisitar('GET', '/protegida'));
    expect(aoSessaoExpirada).toHaveBeenCalledTimes(2);
  });

  it('401 do login (não autenticado) é mensagem e não avisa a sessão', async () => {
    const aoSessaoExpirada = jest.fn();
    entrarComoMock('mock-empresa', aoSessaoExpirada);

    const erro = await capturar(
      requisitar('POST', '/login', {
        autenticado: false,
        corpo: { email: 'x@y.com', senha: 'senhaerrada1' },
      }),
    );

    expect(erro.tipo).toBe('mensagem');
    expect(erro.status).toBe(401);
    expect(erro.mensagens).toEqual(['email ou senha inválidos']);
    expect(aoSessaoExpirada).not.toHaveBeenCalled();
  });

  it('não avisa se o usuário já trocou de token quando o 401 volta', async () => {
    let token = 'mock-empresa';
    const aoSessaoExpirada = jest.fn();
    configurarCliente({ obterToken: () => token, aoSessaoExpirada });
    servidor.use(
      http.get(urlMock('/lenta'), () => {
        token = 'mock-motorista';
        return respostaErro(401, 'token inválido ou expirado');
      }),
    );

    await capturar(requisitar('GET', '/lenta'));

    expect(aoSessaoExpirada).not.toHaveBeenCalled();
  });
});

describe('montarConsulta', () => {
  it('monta e codifica os parâmetros', () => {
    expect(montarConsulta({ lat: -18.9186, lng: -48.2772, raio_km: 100 })).toBe(
      '?lat=-18.9186&lng=-48.2772&raio_km=100',
    );
    expect(montarConsulta({ q: 'a b&c' })).toBe('?q=a%20b%26c');
  });

  it('devolve vazio sem parâmetros', () => {
    expect(montarConsulta({})).toBe('');
  });
});

describe('config', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = original;
    reiniciarConfig();
  });

  it('lê EXPO_PUBLIC_API_URL e tira a barra final', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.mock.test///';
    reiniciarConfig();
    expect(obterBaseUrl()).toBe('http://api.mock.test');
  });

  it('lê uma vez e guarda', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://primeira.test';
    reiniciarConfig();
    expect(obterBaseUrl()).toBe('http://primeira.test');
    process.env.EXPO_PUBLIC_API_URL = 'http://segunda.test';
    expect(obterBaseUrl()).toBe('http://primeira.test');
  });

  it('lança erro claro quando a variável está vazia', () => {
    process.env.EXPO_PUBLIC_API_URL = '   ';
    reiniciarConfig();
    expect(() => obterBaseUrl()).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('requisitar não esconde a falta de configuração como falha de rede', async () => {
    process.env.EXPO_PUBLIC_API_URL = '';
    reiniciarConfig();
    await expect(requisitar('GET', '/saude')).rejects.toThrow(/EXPO_PUBLIC_API_URL/);
  });
});
