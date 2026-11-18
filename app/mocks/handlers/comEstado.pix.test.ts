// Modo Pix do mock com estado (card 048): imita PAGAMENTOS_MODO=sandbox do backend. O modo simulado
// (padrão) segue devolvendo `retido` sem `pix`. Pelos fetchers reais do app.
import { configurarCliente, requisitar } from '@/api/cliente';
import { listarMeusFretes, pagarFrete } from '@/api/fretes';
import { entrarNaApi } from '@/api/sessao';
import { ErroApi } from '@/lib/erros';

import { servidor, URL_BASE_TESTE } from '../node';

import { criarHandlersComEstado } from './comEstado';

async function entrarComoEmpresa(): Promise<void> {
  const { token } = await entrarNaApi('empresa@fluxo.test', 'senha12345');
  configurarCliente({ obterToken: () => token, aoSessaoExpirada: () => undefined });
}

const mock = (caminho: string, corpo?: Record<string, unknown>) =>
  requisitar<{ id?: string }>('POST', caminho, { autenticado: false, corpo });

async function novoFrete(corpo: Record<string, unknown> = {}): Promise<string> {
  const { id } = await mock('/__mock/fretes', corpo);
  return id ?? '';
}

const statusDe = async (id: string) =>
  (await listarMeusFretes()).fretes.find((f) => f.id === id)?.status_pagamento;

beforeEach(async () => {
  servidor.use(...criarHandlersComEstado(URL_BASE_TESTE));
  await mock('/__mock/reset');
  await entrarComoEmpresa();
});

describe('POST /fretes/:id/pagamento no mock com estado', () => {
  it('modo simulado (padrão): 201 retido, sem pix', async () => {
    const id = await novoFrete();
    const resposta = await pagarFrete(id);
    expect(resposta.transacao.status_pagamento).toBe('retido');
    expect(resposta.pix).toBeUndefined();
    expect(await statusDe(id)).toBe('retido');
  });

  it('modo Pix: 201 pendente com pix; confirma depois de N leituras da lista', async () => {
    await mock('/__mock/pix', { leituras: 2 });
    const id = await novoFrete();
    const resposta = await pagarFrete(id);
    expect(resposta.transacao.status_pagamento).toBe('pendente');
    expect(resposta.pix).toEqual({
      copia_e_cola: expect.stringMatching(/^\S.+/),
      qr_code_base64: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
      expira_em: expect.any(String),
    });
    expect(await statusDe(id)).toBe('pendente');
    expect(await statusDe(id)).toBe('retido');
  });

  it('modo Pix sem leituras: só vira retido quando o teste "paga"', async () => {
    await mock('/__mock/pix');
    const id = await novoFrete();
    await pagarFrete(id);
    expect(await statusDe(id)).toBe('pendente');
    expect(await statusDe(id)).toBe('pendente');
    await mock('/__mock/pix/pagar');
    expect(await statusDe(id)).toBe('retido');
  });

  it('modo Pix: código com o tamanho pedido e validade configurável', async () => {
    await mock('/__mock/pix', { tamanhoCodigo: 400, expiraEmSegundos: -60 });
    const { pix } = await pagarFrete(await novoFrete());
    expect(pix?.copia_e_cola).toHaveLength(400);
    expect(Date.parse(pix?.expira_em ?? '')).toBeLessThan(Date.now());
  });

  it('modo Pix: gateway com falha dá 502; repetir depois do pagamento dá 409; entregue dá 409', async () => {
    await mock('/__mock/pix', { falharGateway: true });
    const id = await novoFrete();
    await expect(pagarFrete(id)).rejects.toMatchObject({ status: 502 });

    await mock('/__mock/pix');
    await pagarFrete(id);
    const repetido = await pagarFrete(id).catch((e: unknown) => e);
    expect(repetido).toBeInstanceOf(ErroApi);
    expect((repetido as ErroApi).mensagens).toEqual(['frete já foi pago']);

    const entregue = await novoFrete({ status_entrega: 'entregue' });
    await expect(pagarFrete(entregue)).rejects.toMatchObject({ status: 409 });
  });
});
