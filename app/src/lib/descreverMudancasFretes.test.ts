import { descreverMudancasFretesEmpresa } from './descreverMudancasFretes';

const frete = (id: string, statusEntrega: string, tipoCarga = `Carga ${id}`) => ({
  id,
  tipo_carga: tipoCarga,
  status_entrega: statusEntrega,
});

describe('descreverMudancasFretesEmpresa', () => {
  it('sem leitura anterior ou atual, não há o que anunciar', () => {
    const lista = { fretes: [frete('a', 'aceito')] };
    expect(descreverMudancasFretesEmpresa(undefined, lista)).toBeNull();
    expect(descreverMudancasFretesEmpresa(lista, undefined)).toBeNull();
  });

  it('nada mudou: null', () => {
    const lista = { fretes: [frete('a', 'aceito'), frete('b', 'entregue')] };
    expect(descreverMudancasFretesEmpresa(lista, { fretes: [...lista.fretes] })).toBeNull();
  });

  it('aceito para em_transito: "Transporte iniciado: tipo"', () => {
    expect(
      descreverMudancasFretesEmpresa(
        { fretes: [frete('a', 'aceito', 'Grãos')] },
        { fretes: [frete('a', 'em_transito', 'Grãos')] },
      ),
    ).toBe('Transporte iniciado: Grãos');
  });

  it('em_transito para entregue: "Entrega confirmada: tipo"', () => {
    expect(
      descreverMudancasFretesEmpresa(
        { fretes: [frete('a', 'em_transito', 'Soja')] },
        { fretes: [frete('a', 'entregue', 'Soja')] },
      ),
    ).toBe('Entrega confirmada: Soja');
  });

  it('várias mudanças saem juntas; frete novo e status sem frase são ignorados', () => {
    expect(
      descreverMudancasFretesEmpresa(
        {
          fretes: [
            frete('a', 'aceito', 'Grãos'),
            frete('b', 'em_transito', 'Soja'),
            frete('c', 'aceito'),
          ],
        },
        {
          fretes: [
            frete('a', 'em_transito', 'Grãos'),
            frete('b', 'entregue', 'Soja'),
            frete('c', 'cancelado'),
            frete('d', 'aceito'),
          ],
        },
      ),
    ).toBe('Transporte iniciado: Grãos. Entrega confirmada: Soja');
  });
});
