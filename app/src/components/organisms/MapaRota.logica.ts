// Lógica do mapa de visualização (card 035, ADR 0017): projeção Web Mercator, escolha do zoom e
// quais ladrilhos (tiles) do OpenStreetMap cobrem a área. Funções puras, sem React nem rede: o mapa
// é só ladrilhos + um desenho vetorial por cima, sem biblioteca de mapa.
import type { Coordenada } from '@/lib/cidades';

export type TipoPonto = 'origem' | 'destino' | 'local' | 'carga';

export interface PontoMapa extends Coordenada {
  tipo: TipoPonto;
}

export interface CirculoMapa {
  centro: Coordenada;
  raioKm: number;
}

export interface PropsMapaRota {
  /** Marcadores do mapa. */
  pontos: readonly PontoMapa[];
  /** Rota desenhada ligando os pontos, na ordem. */
  linha?: readonly Coordenada[];
  /** Raio de busca em volta de um ponto. */
  circulo?: CirculoMapa;
  /** Rótulo do contêiner para leitor de tela ("Mapa da rota de A a B"). O texto da tela traz o conteúdo. */
  descricao: string;
}

export const LADO_LADRILHO = 256;
export { ALTURA_MAPA } from './MapaRota.constantes';
const MARGEM = 28;
const ZOOM_MINIMO = 3;
const ZOOM_MAXIMO = 14;
const KM_POR_GRAU = 111.32;
const METROS_EQUADOR_POR_PIXEL_Z0 = 156543.03392;

export const ATRIBUICAO = '© OpenStreetMap contributors';

/** Endereço do ladrilho; `x` dá a volta no globo. */
export function urlDoLadrilho(z: number, x: number, y: number): string {
  const n = 2 ** z;
  const xv = ((x % n) + n) % n;
  return `https://tile.openstreetmap.org/${z}/${xv}/${y}.png`;
}

/** Pixel do mundo (grade de 256·2^z) de uma coordenada, em Web Mercator. */
export function projetar({ lat, lng }: Coordenada, zoom: number): { x: number; y: number } {
  const tamanho = LADO_LADRILHO * 2 ** zoom;
  const seno = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * tamanho,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * tamanho,
  };
}

export interface Limites {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Menor caixa que contém pontos, linha e o círculo de busca. */
export function limitesDe({ pontos, linha, circulo }: PropsMapaRota): Limites {
  const todos: Coordenada[] = [...pontos, ...(linha ?? [])];
  const limites: Limites = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  };
  const incluir = ({ lat, lng }: Coordenada) => {
    limites.minLat = Math.min(limites.minLat, lat);
    limites.maxLat = Math.max(limites.maxLat, lat);
    limites.minLng = Math.min(limites.minLng, lng);
    limites.maxLng = Math.max(limites.maxLng, lng);
  };
  todos.forEach(incluir);
  if (circulo) {
    const dLat = circulo.raioKm / KM_POR_GRAU;
    const dLng = circulo.raioKm / (KM_POR_GRAU * Math.cos((circulo.centro.lat * Math.PI) / 180));
    incluir({ lat: circulo.centro.lat - dLat, lng: circulo.centro.lng - dLng });
    incluir({ lat: circulo.centro.lat + dLat, lng: circulo.centro.lng + dLng });
  }
  return limites;
}

/** Maior zoom em que a caixa cabe na área, deixando uma margem para os marcadores. */
export function escolherZoom(limites: Limites, largura: number, altura: number): number {
  for (let z = ZOOM_MAXIMO; z > ZOOM_MINIMO; z -= 1) {
    const a = projetar({ lat: limites.maxLat, lng: limites.minLng }, z);
    const b = projetar({ lat: limites.minLat, lng: limites.maxLng }, z);
    if (b.x - a.x <= largura - 2 * MARGEM && b.y - a.y <= altura - 2 * MARGEM) return z;
  }
  return ZOOM_MINIMO;
}

export interface Ladrilho {
  chave: string;
  url: string;
  esquerda: number;
  topo: number;
}

export interface CenaMapa {
  zoom: number;
  ladrilhos: Ladrilho[];
  pontos: { x: number; y: number; tipo: TipoPonto }[];
  linha: { x: number; y: number }[];
  circulo: { x: number; y: number; raio: number } | null;
}

/** Raio do marcador grande (A e B) em pixels; os dois não podem ficar um sobre o outro. */
export const RAIO_MARCADOR = 12;
const AFASTAMENTO_ORIGEM_DESTINO = RAIO_MARCADOR + 2;

/**
 * Origem e destino no mesmo lugar (ou a menos de dois raios) escondiam o "A" sob o "B": afasta os dois
 * na horizontal, lado a lado, para as duas letras continuarem legíveis. O centro do mapa não muda.
 */
export function afastarOrigemDoDestino<T extends { x: number; y: number; tipo: TipoPonto }>(
  pontos: T[],
): T[] {
  const origem = pontos.find((p) => p.tipo === 'origem');
  const destino = pontos.find((p) => p.tipo === 'destino');
  if (!origem || !destino) return pontos;
  if (Math.hypot(origem.x - destino.x, origem.y - destino.y) >= 2 * RAIO_MARCADOR) return pontos;
  return pontos.map((p) =>
    p === origem
      ? { ...p, x: p.x - AFASTAMENTO_ORIGEM_DESTINO }
      : p === destino
        ? { ...p, x: p.x + AFASTAMENTO_ORIGEM_DESTINO }
        : p,
  );
}

export const MENSAGEM_FUNDO_INDISPONIVEL =
  'Fundo do mapa indisponível; a rota e o texto continuam valendo.';

/** Todos os ladrilhos da cena falharam (sem rede, bloqueio ou o serviço de mapas fora do ar). */
export function todosOsLadrilhosFalharam(
  ladrilhos: readonly Ladrilho[],
  falhas: ReadonlySet<string>,
): boolean {
  return ladrilhos.length > 0 && ladrilhos.every((l) => falhas.has(l.chave));
}

/** Tudo o que o desenho precisa, em pixels da área (0,0 no canto superior esquerdo). */
export function montarCena(props: PropsMapaRota, largura: number, altura: number): CenaMapa {
  const limites = limitesDe(props);
  const zoom = escolherZoom(limites, largura, altura);
  const centro = projetar(
    { lat: (limites.minLat + limites.maxLat) / 2, lng: (limites.minLng + limites.maxLng) / 2 },
    zoom,
  );
  const x0 = centro.x - largura / 2;
  const y0 = centro.y - altura / 2;
  const emTela = (c: Coordenada) => {
    const p = projetar(c, zoom);
    return { x: p.x - x0, y: p.y - y0 };
  };

  const ladrilhos: Ladrilho[] = [];
  const limiteY = 2 ** zoom;
  const ultimoY = Math.floor((y0 + altura) / LADO_LADRILHO);
  const ultimoX = Math.floor((x0 + largura) / LADO_LADRILHO);
  for (let ty = Math.floor(y0 / LADO_LADRILHO); ty <= ultimoY; ty += 1) {
    if (ty < 0 || ty >= limiteY) continue;
    for (let tx = Math.floor(x0 / LADO_LADRILHO); tx <= ultimoX; tx += 1) {
      ladrilhos.push({
        chave: `${zoom}/${tx}/${ty}`,
        url: urlDoLadrilho(zoom, tx, ty),
        esquerda: Math.round(tx * LADO_LADRILHO - x0),
        topo: Math.round(ty * LADO_LADRILHO - y0),
      });
    }
  }

  const metrosPorPixel = (c: Coordenada) =>
    (METROS_EQUADOR_POR_PIXEL_Z0 * Math.cos((c.lat * Math.PI) / 180)) / 2 ** zoom;
  return {
    zoom,
    ladrilhos,
    pontos: afastarOrigemDoDestino(props.pontos.map((p) => ({ ...emTela(p), tipo: p.tipo }))),
    linha: (props.linha ?? []).map(emTela),
    circulo: props.circulo
      ? {
          ...emTela(props.circulo.centro),
          raio: (props.circulo.raioKm * 1000) / metrosPorPixel(props.circulo.centro),
        }
      : null,
  };
}

/** Letra dentro do marcador (a cor nunca é o único sinal). */
export const LETRA_DO_TIPO: Record<TipoPonto, string> = {
  origem: 'A',
  destino: 'B',
  local: '●',
  carga: '',
};

/** Legenda em texto do que o desenho mostra, só com o que existe no mapa. */
export function legendaDoMapa({ pontos, circulo }: PropsMapaRota): string {
  const tipos = new Set(pontos.map((p) => p.tipo));
  const partes: string[] = [];
  if (tipos.has('origem')) partes.push('A: coleta');
  if (tipos.has('destino')) partes.push('B: entrega');
  if (tipos.has('local')) partes.push('●: sua disponibilidade');
  if (tipos.has('carga')) partes.push('pontos pequenos: coleta das cargas da lista');
  if (circulo) partes.push('círculo: raio de busca');
  return partes.join(' · ');
}
