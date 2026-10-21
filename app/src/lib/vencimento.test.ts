import { estaVencido, statusEfetivo } from './vencimento';

const agora = new Date('2026-10-20T12:00:00.000Z');
const ontem = '2026-10-19T12:00:00.000Z';
const amanha = '2026-10-21T12:00:00.000Z';

describe('estaVencido (CT-10)', () => {
  it('aberto com expira_em no passado está vencido', () => {
    expect(estaVencido('aberto', ontem, agora)).toBe(true);
  });

  it('aberto com expira_em exatamente agora está vencido (≤ agora)', () => {
    expect(estaVencido('aberto', agora.toISOString(), agora)).toBe(true);
  });

  it('aberto com expira_em no futuro não está vencido', () => {
    expect(estaVencido('aberto', amanha, agora)).toBe(false);
  });

  it('só o status aberto vence: fechado e cancelado não', () => {
    expect(estaVencido('fechado', ontem, agora)).toBe(false);
    expect(estaVencido('cancelado', ontem, agora)).toBe(false);
    expect(estaVencido('expirado', ontem, agora)).toBe(false);
  });

  it('sem expira_em ou com texto inválido não vence', () => {
    expect(estaVencido('aberto', null, agora)).toBe(false);
    expect(estaVencido('aberto', undefined, agora)).toBe(false);
    expect(estaVencido('aberto', '', agora)).toBe(false);
    expect(estaVencido('aberto', 'não é data', agora)).toBe(false);
  });

  it('usa o relógio atual quando "agora" não é informado', () => {
    expect(estaVencido('aberto', '2000-01-01T00:00:00.000Z')).toBe(true);
    expect(estaVencido('aberto', '2999-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('statusEfetivo (CT-10)', () => {
  it('aberto vencido vira expirado', () => {
    expect(statusEfetivo('aberto', ontem, agora)).toBe('expirado');
  });

  it('fechado continua fechado mesmo com prazo passado', () => {
    expect(statusEfetivo('fechado', ontem, agora)).toBe('fechado');
  });

  it('aberto dentro do prazo continua aberto', () => {
    expect(statusEfetivo('aberto', amanha, agora)).toBe('aberto');
  });
});
