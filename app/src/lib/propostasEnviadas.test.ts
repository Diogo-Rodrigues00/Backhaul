import { apagar, CHAVES, gravar, ler } from './armazenamento';
import {
  lerListaPropostasEnviadas,
  lerPropostasEnviadas,
  registrarPropostaEnviada,
  serializarPropostasEnviadas,
} from './propostasEnviadas';

jest.mock('./armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: { propostasEnviadas: 'backhaul.propostasEnviadas' },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

const AGORA = new Date('2026-10-22T15:00:00.000Z');

beforeEach(async () => {
  await apagar(CHAVES.propostasEnviadas);
});

describe('propostas enviadas (plano B de D-PO-05)', () => {
  it('sem nada gravado, a lista é vazia', async () => {
    expect(await lerPropostasEnviadas()).toEqual([]);
  });

  it('registra a proposta com carga, tipo e data, e a lê de volta', async () => {
    await registrarPropostaEnviada('carga-1', 'aceite', AGORA);
    expect(await lerPropostasEnviadas()).toEqual([
      { cargaId: 'carga-1', enviadaEm: '2026-10-22T15:00:00.000Z', tipo: 'aceite' },
    ]);
    expect(JSON.parse((await ler(CHAVES.propostasEnviadas)) ?? '')).toHaveLength(1);
  });

  it('guarda uma entrada por carga: a mais nova substitui a anterior', async () => {
    await registrarPropostaEnviada('carga-1', 'contraproposta', AGORA);
    await registrarPropostaEnviada('carga-2', 'aceite', AGORA);
    await registrarPropostaEnviada('carga-1', 'aceite', new Date('2026-10-22T16:00:00.000Z'));
    const lista = await lerPropostasEnviadas();
    expect(lista.map((p) => p.cargaId)).toEqual(['carga-2', 'carga-1']);
    expect(lista[1]).toMatchObject({ tipo: 'aceite', enviadaEm: '2026-10-22T16:00:00.000Z' });
  });

  it('sem data informada usa o momento atual', async () => {
    await registrarPropostaEnviada('carga-9', 'aceite');
    const [proposta] = await lerPropostasEnviadas();
    expect(Number.isNaN(Date.parse(proposta?.enviadaEm ?? ''))).toBe(false);
  });

  it('texto estragado ou de outro formato vira lista vazia', () => {
    expect(lerListaPropostasEnviadas(null)).toEqual([]);
    expect(lerListaPropostasEnviadas('')).toEqual([]);
    expect(lerListaPropostasEnviadas('{não é json')).toEqual([]);
    expect(lerListaPropostasEnviadas('{"cargaId":"x"}')).toEqual([]);
    expect(lerListaPropostasEnviadas('"texto"')).toEqual([]);
  });

  it('descarta itens inválidos e mantém os bons', () => {
    const bom = { cargaId: 'a', enviadaEm: AGORA.toISOString(), tipo: 'aceite' as const };
    const texto = JSON.stringify([
      bom,
      null,
      3,
      { cargaId: 'b', tipo: 'aceite' },
      { ...bom, tipo: 'x' },
    ]);
    expect(lerListaPropostasEnviadas(texto)).toEqual([bom]);
  });

  it('serializa e lê de volta a mesma lista', async () => {
    await gravar(
      CHAVES.propostasEnviadas,
      serializarPropostasEnviadas([
        { cargaId: 'c', enviadaEm: AGORA.toISOString(), tipo: 'contraproposta' },
      ]),
    );
    expect(await lerPropostasEnviadas()).toHaveLength(1);
  });
});
