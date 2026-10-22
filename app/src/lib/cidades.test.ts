import { type Cidade, cidades } from '@/data/cidades';
import { buscarCidades, cidadeMaisProxima, normalizar, rotuloDoLocal } from '@/lib/cidades';

// Fixture própria: os testes não dependem da lista final de cidades.
const FIXTURE: readonly Cidade[] = [
  { id: 3170206, nome: 'Uberlândia', uf: 'MG', lat: -18.9141, lng: -48.2749 },
  { id: 3170107, nome: 'Uberaba', uf: 'MG', lat: -19.7472, lng: -47.9381 },
  { id: 5201108, nome: 'Anápolis', uf: 'GO', lat: -16.3281, lng: -48.953 },
];

const uberlandia = FIXTURE[0] as Cidade;
const uberaba = FIXTURE[1] as Cidade;
const anapolis = FIXTURE[2] as Cidade;

// 1 km ao norte do centro (1 grau de latitude ≈ 111,2 km).
const UM_KM_AO_NORTE_DE_UBERLANDIA = { lat: uberlandia.lat + 1 / 111.2, lng: uberlandia.lng };

describe('normalizar', () => {
  it('põe em minúsculas e remove acentos e cedilha', () => {
    expect(normalizar('Uberlândia')).toBe('uberlandia');
    expect(normalizar('AÇÃO')).toBe('acao');
    expect(normalizar('São Paulo')).toBe('sao paulo');
  });

  it('deixa texto sem acento como está, em minúsculas', () => {
    expect(normalizar('Franca')).toBe('franca');
  });
});

describe('buscarCidades', () => {
  it('acha pelo nome sem acento', () => {
    expect(buscarCidades('uberlandia', 8, FIXTURE)).toEqual([uberlandia]);
  });

  it('ignora maiúsculas e acento: "UBERL" também acha Uberlândia', () => {
    expect(buscarCidades('UBERL', 8, FIXTURE)).toEqual([uberlandia]);
    expect(buscarCidades('Anápolis', 8, FIXTURE)).toEqual([anapolis]);
  });

  it('casa só pelo começo do nome, não pelo meio', () => {
    expect(buscarCidades('polis', 8, FIXTURE)).toEqual([]);
    expect(buscarCidades('anap', 8, FIXTURE)).toEqual([anapolis]);
  });

  it('devolve em ordem alfabética, sem acento', () => {
    expect(buscarCidades('uber', 8, FIXTURE)).toEqual([uberaba, uberlandia]);
  });

  it('respeita o limite', () => {
    expect(buscarCidades('uber', 1, FIXTURE)).toEqual([uberaba]);
    expect(buscarCidades('uber', 0, FIXTURE)).toEqual([]);
  });

  it('limite padrão é 8', () => {
    const muitas: Cidade[] = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      nome: `Cidade ${String(i).padStart(2, '0')}`,
      uf: 'SP',
      lat: -23,
      lng: -46,
    }));
    expect(buscarCidades('cidade', undefined, muitas)).toHaveLength(8);
  });

  it('termo vazio ou só com espaços devolve lista vazia', () => {
    expect(buscarCidades('', 8, FIXTURE)).toEqual([]);
    expect(buscarCidades('   ', 8, FIXTURE)).toEqual([]);
  });

  it('sem resultado devolve lista vazia', () => {
    expect(buscarCidades('xyz', 8, FIXTURE)).toEqual([]);
  });
});

describe('cidadeMaisProxima', () => {
  it('a 1 km do centro de uma cidade devolve essa cidade', () => {
    expect(cidadeMaisProxima(UM_KM_AO_NORTE_DE_UBERLANDIA, FIXTURE)).toEqual(uberlandia);
  });

  it('devolve a cidade do ponto mais perto, não a primeira da lista', () => {
    expect(cidadeMaisProxima({ lat: anapolis.lat, lng: anapolis.lng }, FIXTURE)).toEqual(anapolis);
  });

  it('lista vazia devolve null', () => {
    expect(cidadeMaisProxima({ lat: -18.9, lng: -48.3 }, [])).toBeNull();
  });

  it('coordenada inválida devolve null', () => {
    expect(cidadeMaisProxima({ lat: Number.NaN, lng: -48 }, FIXTURE)).toBeNull();
    expect(cidadeMaisProxima({ lat: 95, lng: -48 }, FIXTURE)).toBeNull();
  });
});

describe('rotuloDoLocal', () => {
  it('devolve "Nome - UF" da cidade mais próxima', () => {
    expect(rotuloDoLocal(UM_KM_AO_NORTE_DE_UBERLANDIA, FIXTURE)).toBe('Uberlândia - MG');
    expect(rotuloDoLocal({ lat: anapolis.lat, lng: anapolis.lng }, FIXTURE)).toBe('Anápolis - GO');
  });

  it('sem cidade na lista devolve null', () => {
    expect(rotuloDoLocal(UM_KM_AO_NORTE_DE_UBERLANDIA, [])).toBeNull();
  });
});

describe('lista de cidades (dado real)', () => {
  it('tem Uberlândia e Uberaba (seed) com lat/lng numéricos em todas as entradas', () => {
    expect(cidades.some((c) => c.nome === 'Uberlândia' && c.uf === 'MG')).toBe(true);
    expect(cidades.some((c) => c.nome === 'Uberaba' && c.uf === 'MG')).toBe(true);
    for (const c of cidades) {
      expect(Number.isFinite(c.lat)).toBe(true);
      expect(Number.isFinite(c.lng)).toBe(true);
    }
  });
});
