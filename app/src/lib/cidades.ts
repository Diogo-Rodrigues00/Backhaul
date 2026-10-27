// Busca de cidades e "cidade mais próxima" (card 007). Funções puras: a lista de cidades entra
// por parâmetro opcional (padrão: src/data/cidades.ts), o que deixa os testes com fixture própria.
// Este módulo só pode ser importado pelo SeletorLocal e pelas telas que mostram nome de cidade
// (ADR 0011): nunca por _layout, templates ou atoms/molecules compartilhados.

import { cidades, type Cidade } from '@/data/cidades';

export type Coordenada = { lat: number; lng: number };

const LIMITE_PADRAO = 8;
// Raio médio da Terra em km, usado na fórmula de haversine.
const RAIO_TERRA_KM = 6371;

/** Minúsculas e sem acento: "Uberlândia" vira "uberlandia". Usada nos dois lados da busca. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Cidades cujo nome começa com o termo (sem acento e sem diferença de maiúscula), em ordem
 * alfabética, no máximo `limite`. Termo vazio ou só com espaços devolve lista vazia.
 */
export function buscarCidades(
  termo: string,
  limite: number = LIMITE_PADRAO,
  lista: readonly Cidade[] = cidades,
): Cidade[] {
  const busca = normalizar(termo).trim();
  if (busca === '' || limite <= 0) {
    return [];
  }
  return lista
    .filter((cidade) => normalizar(cidade.nome).startsWith(busca))
    .sort((a, b) => {
      const nomeA = normalizar(a.nome);
      const nomeB = normalizar(b.nome);
      return nomeA < nomeB ? -1 : nomeA > nomeB ? 1 : 0;
    })
    .slice(0, limite);
}

const emRadianos = (graus: number): number => (graus * Math.PI) / 180;

function coordenadaValida({ lat, lng }: Coordenada): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

// Distância em km entre dois pontos na superfície terrestre (haversine).
function distanciaKm(origem: Coordenada, destino: Coordenada): number {
  const dLat = emRadianos(destino.lat - origem.lat);
  const dLng = emRadianos(destino.lng - origem.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(emRadianos(origem.lat)) * Math.cos(emRadianos(destino.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Cidade da lista com o centro mais perto do ponto. Devolve null se o ponto não tiver
 * coordenadas válidas ou se a lista estiver vazia.
 */
export function cidadeMaisProxima(
  ponto: Coordenada,
  lista: readonly Cidade[] = cidades,
): Cidade | null {
  if (!coordenadaValida(ponto)) {
    return null;
  }
  let maisProxima: Cidade | null = null;
  let menorDistancia = Number.POSITIVE_INFINITY;
  for (const cidade of lista) {
    const distancia = distanciaKm(ponto, cidade);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      maisProxima = cidade;
    }
  }
  return maisProxima;
}

/** Rótulo "Nome - UF" da cidade mais próxima do ponto, ex.: "Uberlândia - MG". Null sem cidade. */
export function rotuloDoLocal(
  ponto: Coordenada,
  lista: readonly Cidade[] = cidades,
): string | null {
  const cidade = cidadeMaisProxima(ponto, lista);
  return cidade ? `${cidade.nome} - ${cidade.uf}` : null;
}
