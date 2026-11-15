// Rótulo de origem e destino de "Meus fretes" (card 044): cidade da lista fixa quando o ponto bate com
// ela; senão as coordenadas em texto. Fixture própria, como em cidades.test.ts.
import type { Cidade } from '@/data/cidades';
import {
  LOCAL_SEM_IDENTIFICACAO,
  rotuloDaCoordenada,
  rotuloDoPonto,
  TOLERANCIA_CIDADE_KM,
} from '@/lib/cidades';

const FIXTURE: readonly Cidade[] = [
  { id: 3170206, nome: 'Uberlândia', uf: 'MG', lat: -18.9141, lng: -48.2749 },
  { id: 3170107, nome: 'Uberaba', uf: 'MG', lat: -19.7472, lng: -47.9381 },
];

describe('rotuloDoPonto', () => {
  it('ponto no centro de uma cidade da lista: "Nome - UF"', () => {
    expect(rotuloDoPonto({ lat: -18.9141, lng: -48.2749 }, FIXTURE)).toBe('Uberlândia - MG');
  });

  it('ponto a menos da tolerância de uma cidade (coordenada antiga do mock): ainda é a cidade', () => {
    // ~0,56 km do centro de Uberlândia na lista.
    expect(rotuloDoPonto({ lat: -18.9186, lng: -48.2772 }, FIXTURE)).toBe('Uberlândia - MG');
  });

  it('ponto longe de qualquer cidade da lista: coordenadas em texto, sem chutar cidade', () => {
    // São Paulo não está na lista fixa.
    expect(rotuloDoPonto({ lat: -23.55, lng: -46.63 }, FIXTURE)).toBe(
      'Latitude -23,5500, longitude -46,6300',
    );
  });

  it('respeita a tolerância informada', () => {
    const ponto = { lat: -18.9141, lng: -48.2749 + 0.02 }; // ~2,2 km a leste do centro
    expect(rotuloDoPonto(ponto, FIXTURE, 1)).toMatch(/^Latitude /);
    expect(rotuloDoPonto(ponto, FIXTURE, 5)).toBe('Uberlândia - MG');
  });

  it('coordenada inválida: "Local não identificado"', () => {
    expect(rotuloDoPonto({ lat: Number.NaN, lng: -48 }, FIXTURE)).toBe(LOCAL_SEM_IDENTIFICACAO);
    expect(rotuloDoPonto({ lat: 95, lng: -48 }, FIXTURE)).toBe(LOCAL_SEM_IDENTIFICACAO);
  });

  it('campo ausente na resposta (undefined ou null): "Local não identificado", sem quebrar', () => {
    expect(rotuloDoPonto(undefined, FIXTURE)).toBe(LOCAL_SEM_IDENTIFICACAO);
    expect(rotuloDoPonto(null, FIXTURE)).toBe(LOCAL_SEM_IDENTIFICACAO);
  });

  it('lista vazia: coordenadas, nunca um nome inventado', () => {
    expect(rotuloDoPonto({ lat: -18.9141, lng: -48.2749 }, [])).toBe(
      'Latitude -18,9141, longitude -48,2749',
    );
  });

  it('a tolerância padrão é de 1 km', () => {
    expect(TOLERANCIA_CIDADE_KM).toBe(1);
  });
});

describe('rotuloDaCoordenada', () => {
  it('4 casas decimais, vírgula como separador, sinal negativo preservado', () => {
    expect(rotuloDaCoordenada({ lat: -18.91, lng: -48.1 })).toBe(
      'Latitude -18,9100, longitude -48,1000',
    );
  });
});
