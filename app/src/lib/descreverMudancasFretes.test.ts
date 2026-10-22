import {
  aplicarStatusFrete,
  descreverMudancasFretes,
  type FreteAcompanhado,
} from './descreverMudancasFretes';

function frete(sobrescrever: Partial<FreteAcompanhado> & { id: string }): FreteAcompanhado {
  return {
    tipo_carga: 'Grãos',
    status_entrega: 'em_transito',
    coleta_em: '2026-10-21T10:00:00.000Z',
    entrega_em: null,
    status_pagamento: null,
    ...sobrescrever,
  };
}

describe('descreverMudancasFretes', () => {
  it('pagamento recebido: o frete passa de sem pagamento a retido', () => {
    const anterior = [frete({ id: 'a', status_pagamento: null })];
    const atual = [frete({ id: 'a', status_pagamento: 'retido' })];
    expect(descreverMudancasFretes(anterior, atual)).toBe(
      'Pagamento recebido: Grãos (retido até a entrega)',
    );
  });

  it('pagamento liberado: empresa paga um frete já entregue (null para liberado)', () => {
    const anterior = [frete({ id: 'a', status_entrega: 'entregue', status_pagamento: null })];
    const atual = [frete({ id: 'a', status_entrega: 'entregue', status_pagamento: 'liberado' })];
    expect(descreverMudancasFretes(anterior, atual)).toBe('Pagamento liberado: Grãos');
  });

  it('junta várias mudanças na ordem da lista atual', () => {
    const anterior = [frete({ id: 'a' }), frete({ id: 'b', tipo_carga: 'Soja' })];
    const atual = [
      frete({ id: 'b', tipo_carga: 'Soja', status_pagamento: 'retido' }),
      frete({ id: 'a', status_pagamento: 'retido' }),
    ];
    expect(descreverMudancasFretes(anterior, atual)).toBe(
      'Pagamento recebido: Soja (retido até a entrega). Pagamento recebido: Grãos (retido até a entrega)',
    );
  });

  it('não repete o que a ação do motorista já anuncia: a entrega muda o status junto do pagamento', () => {
    const anterior = [frete({ id: 'a', status_pagamento: 'retido' })];
    const atual = [frete({ id: 'a', status_entrega: 'entregue', status_pagamento: 'liberado' })];
    expect(descreverMudancasFretes(anterior, atual)).toBeNull();
  });

  it('devolve null sem mudança de pagamento, sem retrato anterior ou com frete novo', () => {
    const lista = [frete({ id: 'a', status_pagamento: 'retido' })];
    expect(descreverMudancasFretes(lista, [...lista])).toBeNull();
    expect(descreverMudancasFretes(undefined, lista)).toBeNull();
    expect(descreverMudancasFretes(lista, undefined)).toBeNull();
    expect(
      descreverMudancasFretes([], [frete({ id: 'novo', status_pagamento: 'retido' })]),
    ).toBeNull();
  });

  it('estorno e pendente não geram frase', () => {
    const anterior = [frete({ id: 'a', status_pagamento: 'retido' })];
    expect(
      descreverMudancasFretes(anterior, [frete({ id: 'a', status_pagamento: 'estornado' })]),
    ).toBeNull();
  });
});

describe('aplicarStatusFrete', () => {
  it('troca status, datas e pagamento só do frete da resposta', () => {
    const lista = [
      { ...frete({ id: 'a' }), empresa: 'X' },
      { ...frete({ id: 'b', status_entrega: 'aceito', coleta_em: null }), empresa: 'Y' },
    ];
    const resultado = aplicarStatusFrete(lista, {
      id: 'b',
      status_entrega: 'em_transito',
      coleta_em: '2026-10-22T08:00:00.000Z',
      entrega_em: null,
      status_pagamento: 'retido',
    });
    expect(resultado[0]).toBe(lista[0]);
    expect(resultado[1]).toEqual({
      id: 'b',
      tipo_carga: 'Grãos',
      status_entrega: 'em_transito',
      coleta_em: '2026-10-22T08:00:00.000Z',
      entrega_em: null,
      status_pagamento: 'retido',
      empresa: 'Y',
    });
  });
});
