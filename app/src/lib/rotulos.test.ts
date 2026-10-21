import {
  proximoPassoFrete,
  rotuloPagamento,
  rotuloStatusCarga,
  rotuloStatusDisponibilidade,
  rotuloStatusEntrega,
  rotuloStatusProposta,
  rotuloTipoProposta,
  rotuloUrgencia,
} from './rotulos';

describe('rotuloUrgencia (D-PO-13)', () => {
  it('rotula cada urgência com texto', () => {
    expect(rotuloUrgencia('normal')).toBe('Normal');
    expect(rotuloUrgencia('urgente')).toBe('Urgente');
    expect(rotuloUrgencia('critico')).toBe('Crítico');
  });
});

describe('rótulos de status', () => {
  it('rotula status de carga e disponibilidade (aberto vira Aberta)', () => {
    expect(rotuloStatusCarga('aberto')).toBe('Aberta');
    expect(rotuloStatusCarga('fechado')).toBe('Fechada');
    expect(rotuloStatusCarga('cancelado')).toBe('Cancelada');
    expect(rotuloStatusCarga('expirado')).toBe('Expirada');
    expect(rotuloStatusDisponibilidade('aberto')).toBe('Aberta');
    expect(rotuloStatusDisponibilidade('expirado')).toBe('Expirada');
  });

  it('rotula status de proposta e tipo de proposta', () => {
    expect(rotuloStatusProposta('pendente')).toBe('Pendente');
    expect(rotuloStatusProposta('aceita')).toBe('Aceita');
    expect(rotuloStatusProposta('recusada')).toBe('Recusada');
    expect(rotuloStatusProposta('expirada')).toBe('Expirada');
    expect(rotuloTipoProposta('aceite')).toBe('Aceita o valor');
    expect(rotuloTipoProposta('contraproposta')).toBe('Contraproposta');
  });

  it('rotula status de entrega', () => {
    expect(rotuloStatusEntrega('aceito')).toBe('Aceito');
    expect(rotuloStatusEntrega('em_transito')).toBe('Em trânsito');
    expect(rotuloStatusEntrega('entregue')).toBe('Entregue');
    expect(rotuloStatusEntrega('cancelado')).toBe('Cancelado');
  });

  it('devolve traço para valor fora do enum, sem vazar o valor cru', () => {
    // Simula um valor novo que a API passe a devolver.
    expect(rotuloStatusCarga('novo' as 'aberto')).toBe('—');
    expect(rotuloUrgencia('extra' as 'normal')).toBe('—');
  });
});

describe('rotuloPagamento (D-PO-07)', () => {
  it('null vira "Aguardando pagamento"', () => {
    expect(rotuloPagamento(null)).toBe('Aguardando pagamento');
  });

  it('rotula retido, liberado e os demais valores do enum', () => {
    expect(rotuloPagamento('retido')).toBe('Pago, retido até a entrega');
    expect(rotuloPagamento('liberado')).toBe('Liberado ao motorista');
    expect(rotuloPagamento('pendente')).toBe('Pendente');
    expect(rotuloPagamento('estornado')).toBe('Estornado');
  });
});

describe('proximoPassoFrete (D-PO-09)', () => {
  it('aceito leva a Iniciar transporte', () => {
    expect(proximoPassoFrete('aceito')).toEqual({
      status: 'em_transito',
      rotulo: 'Iniciar transporte',
    });
  });

  it('em_transito leva a Confirmar entrega', () => {
    expect(proximoPassoFrete('em_transito')).toEqual({
      status: 'entregue',
      rotulo: 'Confirmar entrega',
    });
  });

  it('entregue e cancelado não têm próximo passo', () => {
    expect(proximoPassoFrete('entregue')).toBeNull();
    expect(proximoPassoFrete('cancelado')).toBeNull();
  });

  it('devolve cópia: alterar o retorno não muda a regra', () => {
    const passo = proximoPassoFrete('aceito');
    if (passo) passo.rotulo = 'alterado';
    expect(proximoPassoFrete('aceito')?.rotulo).toBe('Iniciar transporte');
  });
});
