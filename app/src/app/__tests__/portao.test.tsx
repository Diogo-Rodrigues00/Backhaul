// Portão do servidor no layout raiz (card 014, ADR 0005, MVP-02). Layout, rotas e sessão reais;
// `GET /saude` e `GET /eu` simulados para controlar o tempo (timers falsos).
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import * as cliente from '@/api/cliente';
import { INTERVALO_SAUDE_MS, reiniciarPortaoServidor, TOTAL_TENTATIVAS } from '@/api/saude';
import * as sessaoApi from '@/api/sessao';
import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import { anunciar } from '@/lib/a11y';
import { ErroApi } from '@/lib/erros';

import { usuarioEmpresa } from '../../../mocks/fixtures/usuarios';
import LayoutEmpresa from '../empresa/_layout';
import MinhasCargas from '../empresa/cargas/index';
import Entrar from '../index';
import LayoutRaiz from '../_layout';

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
// O foco e o anúncio não importam aqui (têm teste próprio); a estrada fica parada.
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
  anunciar: jest.fn(),
}));
jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: () => true }));

type Resposta = 'ok' | 'falha' | 'pendente';

/** `GET /saude` responde conforme a lista (a última vale daí em diante). O resto vai à API de mock. */
function simularSaude(respostas: Resposta[]) {
  const original = cliente.requisitar;
  let chamadas = 0;
  jest.spyOn(cliente, 'requisitar').mockImplementation(((metodo, caminho, opcoes) => {
    if (caminho !== '/saude') return original(metodo, caminho, opcoes);
    const resposta = respostas[Math.min(chamadas, respostas.length - 1)];
    chamadas += 1;
    if (resposta === 'ok') return Promise.resolve({ status: 'ok', banco: 'conectado' });
    if (resposta === 'pendente') return new Promise(() => undefined);
    return Promise.reject(ErroApi.falha(503));
  }) as typeof cliente.requisitar);
  return () => chamadas;
}

async function avancar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function abrir() {
  await renderRouter(
    {
      _layout: LayoutRaiz,
      index: Entrar,
      entrar: Entrar,
      'empresa/_layout': LayoutEmpresa,
      'empresa/cargas/index': MinhasCargas,
    },
    { initialUrl: '/' },
  );
}

const h1 = (nome: string) => screen.queryByRole('heading', { name: nome });
const CONECTANDO = 'Conectando ao servidor';
const FALHOU = 'Não foi possível conectar ao servidor';

beforeEach(async () => {
  jest.useFakeTimers();
  reiniciarPortaoServidor();
  await apagar(CHAVES.token);
  jest.mocked(anunciar).mockClear();
});

afterEach(() => {
  reiniciarPortaoServidor();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('portão do servidor no layout raiz', () => {
  it('servidor rápido: a tela nunca aparece e o app segue (sem alterar a página)', async () => {
    const chamadas = simularSaude(['ok']);
    await abrir();
    await avancar(INTERVALO_SAUDE_MS * 2);

    expect(chamadas()).toBe(1);
    expect(h1(CONECTANDO)).toBeNull();
    expect(h1('Backhaul')).toBeOnTheScreen();
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('antes de 0,5 s a página aparece normalmente; depois, sem resposta, aparece a tela', async () => {
    simularSaude(['pendente']);
    await abrir();

    expect(h1('Backhaul')).toBeOnTheScreen();
    await avancar(499);
    expect(h1(CONECTANDO)).toBeNull();
    expect(h1('Backhaul')).toBeOnTheScreen();

    await avancar(1);
    expect(h1(CONECTANDO)).toBeOnTheScreen();
    expect(h1('Backhaul')).toBeNull();
    expect(screen.getByText('Tentativa 1 de 18')).toBeOnTheScreen();
  });

  it('503 por 6 s: mostra a tela, conta as tentativas a cada 5 s e libera sozinha', async () => {
    const chamadas = simularSaude(['falha', 'falha', 'ok']);
    await abrir();

    await avancar(600);
    expect(h1(CONECTANDO)).toBeOnTheScreen();
    expect(screen.getByText('Tentativa 1 de 18')).toBeOnTheScreen();

    await avancar(INTERVALO_SAUDE_MS);
    expect(screen.getByText('Tentativa 2 de 18')).toBeOnTheScreen();
    expect(h1(CONECTANDO)).toBeOnTheScreen();

    await avancar(INTERVALO_SAUDE_MS);
    expect(chamadas()).toBe(3);
    expect(h1(CONECTANDO)).toBeNull();
    expect(h1('Backhaul')).toBeOnTheScreen();
    expect(anunciar).toHaveBeenCalledWith('Servidor conectado.');
  });

  it('90 s sem 200: mostra a falha e "Tentar de novo" recomeça o ciclo', async () => {
    const chamadas = simularSaude(['falha']);
    await abrir();

    await avancar(INTERVALO_SAUDE_MS * TOTAL_TENTATIVAS);
    expect(chamadas()).toBe(TOTAL_TENTATIVAS);
    expect(h1(FALHOU)).toBeOnTheScreen();
    expect(h1(CONECTANDO)).toBeNull();
    const botao = screen.getByRole('button', { name: 'Tentar de novo' });

    await fireEvent.press(botao);
    expect(chamadas()).toBe(TOTAL_TENTATIVAS + 1);
    expect(h1(FALHOU)).toBeNull();

    await avancar(600);
    expect(h1(CONECTANDO)).toBeOnTheScreen();
    expect(screen.getByText('Tentativa 1 de 18')).toBeOnTheScreen();
  });

  it('com sessão, a restauração espera o servidor acordar (não manda ao login)', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    simularSaude(['falha', 'falha', 'ok']);
    const buscarEu = jest
      .spyOn(sessaoApi, 'buscarEu')
      .mockResolvedValue({ usuario: usuarioEmpresa.usuario });
    await renderRouter(
      {
        _layout: LayoutRaiz,
        index: Entrar,
        entrar: Entrar,
        'empresa/_layout': LayoutEmpresa,
        'empresa/cargas/index': MinhasCargas,
      },
      { initialUrl: '/empresa/cargas' },
    );

    await avancar(INTERVALO_SAUDE_MS);
    expect(h1(CONECTANDO)).toBeOnTheScreen();
    expect(buscarEu).not.toHaveBeenCalled();
    expect(screen.getByText('Tentativa 2 de 18')).toBeOnTheScreen();

    await avancar(INTERVALO_SAUDE_MS);
    expect(buscarEu).toHaveBeenCalledTimes(1);
  });

  it('a verificação é uma vez por abertura: navegar não refaz /saude', async () => {
    const chamadas = simularSaude(['ok']);
    await abrir();
    await avancar(INTERVALO_SAUDE_MS);
    await act(async () => router.push('/empresa/cargas'));
    await avancar(INTERVALO_SAUDE_MS * 2);
    await act(async () => router.push('/'));
    await avancar(INTERVALO_SAUDE_MS * 2);
    expect(chamadas()).toBe(1);
    expect(h1(CONECTANDO)).toBeNull();
  });
});
