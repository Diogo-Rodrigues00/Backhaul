import { cidades } from '@/data/cidades';

import type { ExpoLocation } from './SeletorLocal.expoLocation';
import {
  ATRASO_CONTAGEM_MS,
  localDeCidade,
  localDeGps,
  obterLocalPorGps,
  rotuloDaCidade,
  textoContagem,
  TEXTO_VAZIO,
} from './SeletorLocal.logica';

const mockPermissao = jest.fn();
const mockPosicao = jest.fn();
// O Jest não executa `import()` dinâmico: o módulo do expo-location entra por um carregador falso.
const carregar = () =>
  Promise.resolve({
    requestForegroundPermissionsAsync: (...args: unknown[]) => mockPermissao(...args),
    getCurrentPositionAsync: (...args: unknown[]) => mockPosicao(...args),
    Accuracy: { Balanced: 3 },
  } as unknown as ExpoLocation);

const uberlandia = cidades.find((c) => c.nome === 'Uberlândia')!;

describe('local por cidade', () => {
  it('usa o centro da cidade e o rótulo "Nome - UF"', () => {
    expect(rotuloDaCidade(uberlandia)).toBe('Uberlândia - MG');
    expect(localDeCidade(uberlandia)).toEqual({
      lat: uberlandia.lat,
      lng: uberlandia.lng,
      rotulo: 'Uberlândia - MG',
      origem: 'cidade',
    });
  });
});

describe('local por GPS', () => {
  it('rotula como "Minha localização atual" com a cidade mais próxima', () => {
    const local = localDeGps(-18.9, -48.3);
    expect(local.origem).toBe('gps');
    expect(local.lat).toBe(-18.9);
    expect(local.lng).toBe(-48.3);
    expect(local.rotulo).toBe('Minha localização atual (perto de Uberlândia - MG)');
  });

  it('coordenada inválida fica só com "Minha localização atual"', () => {
    expect(localDeGps(Number.NaN, 0).rotulo).toBe('Minha localização atual');
  });
});

describe('textoContagem', () => {
  it('singular, plural e vazio', () => {
    expect(textoContagem(1)).toBe('1 resultado');
    expect(textoContagem(5)).toBe('5 resultados');
    expect(textoContagem(0)).toBe(TEXTO_VAZIO);
    expect(ATRASO_CONTAGEM_MS).toBe(300);
  });
});

describe('obterLocalPorGps', () => {
  beforeEach(() => {
    mockPermissao.mockReset();
    mockPosicao.mockReset();
  });

  it('com permissão devolve as coordenadas do aparelho', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockResolvedValue({ coords: { latitude: -18.9186, longitude: -48.2772 } });
    const resultado = await obterLocalPorGps(undefined, carregar);
    expect(resultado).toEqual({
      ok: true,
      local: {
        lat: -18.9186,
        lng: -48.2772,
        rotulo: 'Minha localização atual (perto de Uberlândia - MG)',
        origem: 'gps',
      },
    });
  });

  it('permissão negada: não lê a posição', async () => {
    mockPermissao.mockResolvedValue({ status: 'denied' });
    expect(await obterLocalPorGps(undefined, carregar)).toEqual({ ok: false, motivo: 'negado' });
    expect(mockPosicao).not.toHaveBeenCalled();
  });

  it('sem resposta do aparelho dentro do limite: timeout', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockReturnValue(new Promise(() => undefined));
    expect(await obterLocalPorGps(20, carregar)).toEqual({ ok: false, motivo: 'timeout' });
  });

  it('erro ao pedir a permissão ou ler a posição: indisponível', async () => {
    mockPermissao.mockRejectedValue(new Error('sem GPS'));
    expect(await obterLocalPorGps(undefined, carregar)).toEqual({
      ok: false,
      motivo: 'indisponivel',
    });
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockRejectedValue(new Error('Location is unavailable'));
    expect(await obterLocalPorGps(undefined, carregar)).toEqual({
      ok: false,
      motivo: 'indisponivel',
    });
  });
});
