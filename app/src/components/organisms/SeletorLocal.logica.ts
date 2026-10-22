// Lógica comum do SeletorLocal (card 018): busca de cidades, GPS e foco. Web e iPhone só mudam a
// apresentação (combobox ARIA na web, botões no iPhone); o resto vive aqui.
// Este arquivo importa o módulo de cidades (ADR 0011): só pode ser importado pelo SeletorLocal e pelas
// telas que o usam, nunca por `_layout`, templates ou atoms/molecules compartilhados.
// `expo-location` entra por import dinâmico ao tocar em "Usar minha localização": fica fora do chunk
// da rota e do JS inicial.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { Cidade } from '@/data/cidades';
import { anunciar, moverFoco } from '@/lib/a11y';
import { buscarCidades, rotuloDoLocal } from '@/lib/cidades';

import { carregarExpoLocation, type ExpoLocation } from './SeletorLocal.expoLocation';

/** Local escolhido: centro da cidade (`cidade`) ou posição do aparelho (`gps`). */
export type Local = {
  lat: number;
  lng: number;
  rotulo: string;
  origem: 'cidade' | 'gps';
};

export interface PropsSeletorLocal {
  /** Nome do campo: "Origem", "Destino", "Onde você está". */
  rotulo: string;
  valor: Local | null;
  /** Recebe o local escolhido, ou `null` quando a pessoa toca em "Trocar". */
  aoMudar: (local: Local | null) => void;
  /** "Usar minha localização": só o motorista (a empresa não vê a opção). */
  permitirGps?: boolean;
  /** Erro do formulário, associado ao campo de busca. */
  erro?: string;
  id?: string;
}

export const LIMITE_RESULTADOS = 8;
/** Espera depois da última tecla antes de anunciar a contagem (não anunciar a cada tecla). */
export const ATRASO_CONTAGEM_MS = 300;
export const TEMPO_LIMITE_GPS_MS = 10_000;

export const TEXTO_VAZIO = 'Nenhuma cidade encontrada. Tente outro nome.';
export const TEXTO_GPS_FALHA = 'Não foi possível usar sua localização.';
export const TEXTO_GPS_FALHA_APOIO = 'Escolha a cidade na lista.';
export const TEXTO_GPS_NEGADO_APOIO =
  'Você não permitiu o acesso à localização. Escolha a cidade na lista.';
export const TEXTO_GPS_CARREGANDO = 'Obtendo localização…';
export const ROTULO_GPS = 'Minha localização atual';

/** "Uberlândia - MG". */
export function rotuloDaCidade(cidade: Cidade): string {
  return `${cidade.nome} - ${cidade.uf}`;
}

export function localDeCidade(cidade: Cidade): Local {
  return { lat: cidade.lat, lng: cidade.lng, rotulo: rotuloDaCidade(cidade), origem: 'cidade' };
}

/** Local do aparelho: "Minha localização atual (perto de Uberlândia - MG)". */
export function localDeGps(lat: number, lng: number): Local {
  const proxima = rotuloDoLocal({ lat, lng });
  return {
    lat,
    lng,
    rotulo: proxima ? `${ROTULO_GPS} (perto de ${proxima})` : ROTULO_GPS,
    origem: 'gps',
  };
}

export function textoContagem(quantidade: number): string {
  if (quantidade === 0) return TEXTO_VAZIO;
  return quantidade === 1 ? '1 resultado' : `${quantidade} resultados`;
}

export type MotivoFalhaGps = 'negado' | 'timeout' | 'indisponivel';
export type ResultadoGps = { ok: true; local: Local } | { ok: false; motivo: MotivoFalhaGps };

class TempoEsgotado extends Error {}

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new TempoEsgotado()), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(temporizador));
}

/**
 * Pede permissão e lê a posição do aparelho (10 s no máximo). Nunca lança: negado, tempo esgotado ou
 * qualquer erro viram `{ ok: false }` e o seletor de cidade segue disponível (D-PO-16).
 */
export async function obterLocalPorGps(
  limiteMs: number = TEMPO_LIMITE_GPS_MS,
  carregar: () => Promise<ExpoLocation> = carregarExpoLocation,
): Promise<ResultadoGps> {
  try {
    const Localizacao = await carregar();
    const permissao = await Localizacao.requestForegroundPermissionsAsync();
    if (permissao.status !== 'granted') return { ok: false, motivo: 'negado' };
    const posicao = await comLimite(
      Localizacao.getCurrentPositionAsync({ accuracy: Localizacao.Accuracy.Balanced }),
      limiteMs,
    );
    return { ok: true, local: localDeGps(posicao.coords.latitude, posicao.coords.longitude) };
  } catch (erro) {
    return { ok: false, motivo: erro instanceof TempoEsgotado ? 'timeout' : 'indisponivel' };
  }
}

export type EstadoGps =
  { situacao: 'ocioso' | 'carregando' } | { situacao: 'falha'; motivo: MotivoFalhaGps };

/**
 * Estado do SeletorLocal: termo, resultados, contagem atrasada, GPS e foco. O foco vai para o botão
 * "Trocar" depois de escolher e para o campo de busca depois de trocar (só quando a pessoa agiu).
 */
export function useSeletorLocal({
  valor,
  aoMudar,
  permitirGps,
}: Pick<PropsSeletorLocal, 'valor' | 'aoMudar' | 'permitirGps'>) {
  const [termo, setTermo] = useState('');
  const [contagemAtrasada, setContagemAtrasada] = useState('');
  const [gps, setGps] = useState<EstadoGps>({ situacao: 'ocioso' });
  const refBusca = useRef<unknown>(null);
  const refTrocar = useRef<unknown>(null);
  const moverFocoDepois = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const resultados = useMemo(() => buscarCidades(termo, LIMITE_RESULTADOS), [termo]);
  const quantidade = resultados.length;
  const buscando = termo.trim() !== '';

  // A contagem só muda 300 ms depois da última tecla: o leitor de tela não fala a cada letra.
  useEffect(() => {
    if (!buscando) return undefined;
    const espera = setTimeout(
      () => setContagemAtrasada(textoContagem(quantidade)),
      ATRASO_CONTAGEM_MS,
    );
    return () => clearTimeout(espera);
  }, [buscando, quantidade, termo]);
  const contagem = buscando ? contagemAtrasada : '';

  const alterarTermo = useCallback((texto: string) => {
    if (texto.trim() === '') setContagemAtrasada('');
    setTermo(texto);
  }, []);

  // Depois de escolher ou trocar, leva o foco para onde a pessoa continua (o campo some e volta).
  useEffect(() => {
    if (!moverFocoDepois.current) return;
    moverFocoDepois.current = false;
    moverFoco(valor ? refTrocar : refBusca);
  }, [valor]);

  const escolher = useCallback(
    (cidade: Cidade) => {
      const local = localDeCidade(cidade);
      moverFocoDepois.current = true;
      setTermo('');
      setContagemAtrasada('');
      setGps({ situacao: 'ocioso' });
      anunciar(`Selecionado: ${local.rotulo}`);
      aoMudar(local);
    },
    [aoMudar],
  );

  const trocar = useCallback(() => {
    moverFocoDepois.current = true;
    setGps({ situacao: 'ocioso' });
    aoMudar(null);
  }, [aoMudar]);

  const emVoo = useRef(false);
  const usarGps = useCallback(async () => {
    if (!permitirGps || emVoo.current) return;
    emVoo.current = true;
    setGps({ situacao: 'carregando' });
    anunciar(TEXTO_GPS_CARREGANDO);
    const resultado = await obterLocalPorGps();
    emVoo.current = false;
    if (!montado.current) return;
    if (resultado.ok) {
      moverFocoDepois.current = true;
      setGps({ situacao: 'ocioso' });
      anunciar(`Localização obtida. Selecionado: ${resultado.local.rotulo}`);
      aoMudar(resultado.local);
      return;
    }
    setGps({ situacao: 'falha', motivo: resultado.motivo });
    anunciar(`${TEXTO_GPS_FALHA} ${TEXTO_GPS_FALHA_APOIO}`);
  }, [permitirGps, aoMudar]);

  return {
    termo,
    setTermo: alterarTermo,
    resultados,
    contagem,
    buscando,
    gps,
    usarGps,
    escolher,
    trocar,
    refBusca: refBusca as RefObject<never>,
    refTrocar: refTrocar as RefObject<never>,
  };
}
