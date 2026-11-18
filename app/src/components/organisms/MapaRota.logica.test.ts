import {
  afastarOrigemDoDestino,
  legendaDoMapa,
  limitesDe,
  montarCena,
  projetar,
  todosOsLadrilhosFalharam,
  urlDoLadrilho,
  type PropsMapaRota,
} from './MapaRota.logica';

const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };

const rota: PropsMapaRota = {
  descricao: 'Mapa da rota',
  pontos: [
    { ...uberlandia, tipo: 'origem' },
    { ...uberaba, tipo: 'destino' },
  ],
  linha: [uberlandia, uberaba],
};

describe('MapaRota.logica', () => {
  it('projeta o equador e o meridiano zero no centro do mundo', () => {
    expect(projetar({ lat: 0, lng: 0 }, 1)).toEqual({ x: 256, y: 256 });
  });

  it('monta a URL do ladrilho do OpenStreetMap e dá a volta no eixo x', () => {
    expect(urlDoLadrilho(5, 10, 12)).toBe('https://tile.openstreetmap.org/5/10/12.png');
    expect(urlDoLadrilho(2, -1, 1)).toBe('https://tile.openstreetmap.org/2/3/1.png');
  });

  it('a caixa inclui pontos, linha e o círculo de busca', () => {
    const sem = limitesDe(rota);
    const com = limitesDe({ ...rota, circulo: { centro: uberlandia, raioKm: 100 } });
    expect(com.maxLat).toBeGreaterThan(sem.maxLat);
    expect(com.minLng).toBeLessThan(sem.minLng);
  });

  it('a rota inteira cabe na área e os ladrilhos cobrem a área', () => {
    const cena = montarCena(rota, 320, 240);
    expect(cena.zoom).toBeGreaterThanOrEqual(3);
    expect(cena.zoom).toBeLessThanOrEqual(14);
    for (const p of cena.pontos) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(320);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(240);
    }
    expect(cena.ladrilhos.length).toBeGreaterThan(0);
    expect(Math.min(...cena.ladrilhos.map((l) => l.esquerda))).toBeLessThanOrEqual(0);
    expect(cena.linha).toHaveLength(2);
    expect(cena.circulo).toBeNull();
  });

  it('com o círculo, o raio em pixels é positivo e o zoom diminui', () => {
    const justa = montarCena(rota, 320, 240);
    const comCirculo = montarCena(
      { ...rota, circulo: { centro: uberlandia, raioKm: 300 } },
      320,
      240,
    );
    expect(comCirculo.circulo?.raio).toBeGreaterThan(0);
    expect(comCirculo.zoom).toBeLessThan(justa.zoom);
  });

  it('um ponto só usa o zoom máximo e não quebra', () => {
    const cena = montarCena(
      { descricao: 'x', pontos: [{ ...uberlandia, tipo: 'local' }] },
      320,
      240,
    );
    expect(cena.zoom).toBe(14);
    expect(cena.pontos[0]).toEqual({ x: 160, y: 120, tipo: 'local' });
  });

  it('a legenda só cita o que está no mapa', () => {
    expect(legendaDoMapa(rota)).toBe('A: coleta · B: entrega');
    expect(
      legendaDoMapa({
        descricao: 'x',
        pontos: [
          { ...uberlandia, tipo: 'local' },
          { ...uberaba, tipo: 'carga' },
        ],
        circulo: { centro: uberlandia, raioKm: 80 },
      }),
    ).toBe(
      '●: sua disponibilidade · pontos pequenos: coleta das cargas da lista · círculo: raio de busca',
    );
  });

  it('origem e destino no mesmo lugar ficam lado a lado (A à esquerda de B)', () => {
    const cena = montarCena(
      {
        descricao: 'x',
        pontos: [
          { ...uberlandia, tipo: 'origem' },
          { ...uberlandia, tipo: 'destino' },
        ],
      },
      320,
      240,
    );
    const [a, b] = cena.pontos;
    expect(b!.x - a!.x).toBeGreaterThanOrEqual(24);
    expect(a!.y).toBe(b!.y);
  });

  it('origem e destino distantes não são mexidos', () => {
    const pontos = [
      { x: 10, y: 10, tipo: 'origem' as const },
      { x: 200, y: 90, tipo: 'destino' as const },
    ];
    expect(afastarOrigemDoDestino(pontos)).toBe(pontos);
  });

  it('só avisa quando TODOS os ladrilhos falharam', () => {
    const ladrilhos = [
      { chave: '1/0/0', url: '', esquerda: 0, topo: 0 },
      { chave: '1/1/0', url: '', esquerda: 256, topo: 0 },
    ];
    expect(todosOsLadrilhosFalharam(ladrilhos, new Set(['1/0/0']))).toBe(false);
    expect(todosOsLadrilhosFalharam(ladrilhos, new Set(['1/0/0', '1/1/0']))).toBe(true);
    expect(todosOsLadrilhosFalharam([], new Set())).toBe(false);
  });
});
