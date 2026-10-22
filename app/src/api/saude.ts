// Portão do servidor (ADR 0005, D-PO-15). O Render dorme (~50 s): o app confere GET /saude
// antes de mostrar a área logada. Uma verificação por abertura do app: o estado vive no
// módulo, então montar o hook de novo não refaz a verificação.
import { useEffect, useSyncExternalStore } from 'react';

import { requisitar } from './cliente';
import type { RespostaSaude } from './tipos';

export const TIMEOUT_SAUDE_MS = 5_000;
export const INTERVALO_SAUDE_MS = 5_000;
export const LIMITE_SAUDE_MS = 90_000;
/** Antes disso a tela "Conectando ao servidor" não aparece (não pisca com servidor acordado). */
export const ATRASO_LENTO_MS = 500;
export const TOTAL_TENTATIVAS = LIMITE_SAUDE_MS / INTERVALO_SAUDE_MS;

export type EstadoPortao = 'verificando' | 'lento' | 'pronto' | 'falhou';

type Retrato = {
  estado: EstadoPortao;
  tentativa: number;
  totalTentativas: number;
};

const RETRATO_INICIAL: Retrato = {
  estado: 'verificando',
  tentativa: 1,
  totalTentativas: TOTAL_TENTATIVAS,
};

let retrato: Retrato = RETRATO_INICIAL;
let iniciada = false;
// Cada verificação ganha um número; uma execução antiga que acorda depois de um reinício se encerra.
let execucaoAtual = 0;
let cronometroLento: ReturnType<typeof setTimeout> | undefined;
let cronometroEspera: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function atualizar(parcial: Partial<Retrato>): void {
  retrato = { ...retrato, ...parcial };
  ouvintes.forEach((ouvinte) => ouvinte());
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => {
    cronometroEspera = setTimeout(resolver, ms);
  });
}

async function tentarUmaVez(): Promise<boolean> {
  try {
    // 503 e qualquer falha viram ErroApi e caem no catch: contam como erro.
    await requisitar<RespostaSaude>('GET', '/saude', {
      autenticado: false,
      timeoutMs: TIMEOUT_SAUDE_MS,
    });
    return true;
  } catch {
    return false;
  }
}

async function executar(numero: number): Promise<void> {
  const aindaVale = () => numero === execucaoAtual;

  cronometroLento = setTimeout(() => {
    if (aindaVale() && retrato.estado === 'verificando') {
      atualizar({ estado: 'lento' });
    }
  }, ATRASO_LENTO_MS);

  for (let tentativa = 1; tentativa <= TOTAL_TENTATIVAS; tentativa += 1) {
    if (!aindaVale()) {
      return;
    }
    atualizar({ tentativa });
    const inicio = Date.now();
    const ok = await tentarUmaVez();
    if (!aindaVale()) {
      return;
    }
    if (ok) {
      clearTimeout(cronometroLento);
      atualizar({ estado: 'pronto' });
      return;
    }
    if (tentativa < TOTAL_TENTATIVAS) {
      await esperar(Math.max(0, INTERVALO_SAUDE_MS - (Date.now() - inicio)));
    }
  }
  if (aindaVale()) {
    clearTimeout(cronometroLento);
    atualizar({ estado: 'falhou' });
  }
}

function iniciar(estadoInicial: 'verificando' | 'lento' = 'verificando'): void {
  iniciada = true;
  execucaoAtual += 1;
  clearTimeout(cronometroLento);
  clearTimeout(cronometroEspera);
  atualizar({ estado: estadoInicial, tentativa: 1 });
  void executar(execucaoAtual);
}

function tentarDeNovo(): void {
  // Depois de uma falha o usuário já sabe que o servidor está lento: volta direto à tela
  // "Conectando" (sem mostrar o app por 500 ms com a sessão ainda sendo restaurada).
  iniciar('lento');
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function obterRetrato(): Retrato {
  return retrato;
}

function obterRetratoServidor(): Retrato {
  return RETRATO_INICIAL;
}

export type PortaoServidor = Retrato & { tentarDeNovo: () => void };

/**
 * Estado da verificação do servidor. `lento` aparece após 500 ms sem resposta; `pronto` quando
 * GET /saude responde 200; `falhou` depois de 18 tentativas (90 s). `tentarDeNovo` reinicia direto em `lento`.
 */
export function usePortaoServidor(): PortaoServidor {
  const atual = useSyncExternalStore(assinar, obterRetrato, obterRetratoServidor);
  useEffect(() => {
    if (!iniciada) {
      iniciar();
    }
  }, []);
  return { ...atual, tentarDeNovo };
}

/** Só para testes: volta ao estado de "app recém-aberto". */
export function reiniciarPortaoServidor(): void {
  execucaoAtual += 1;
  clearTimeout(cronometroLento);
  clearTimeout(cronometroEspera);
  iniciada = false;
  retrato = RETRATO_INICIAL;
  ouvintes.forEach((ouvinte) => ouvinte());
}
