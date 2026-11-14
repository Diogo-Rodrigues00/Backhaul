import { motivoCargaIndisponivel, type CargaDaProposta } from './cargaDaProposta';

// Relógio fixo: 14/11/2026, 12:00 de Brasília.
const agora = new Date('2026-11-14T12:00:00-03:00');
const noPrazo = '2026-11-15T12:00:00-03:00';
const vencida = '2026-11-14T11:00:00-03:00';

function proposta(parcial: Partial<CargaDaProposta> = {}): CargaDaProposta {
  return { status: 'pendente', carga_status: 'aberto', carga_expira_em: noPrazo, ...parcial };
}

describe('motivoCargaIndisponivel (card 050)', () => {
  it('carga aberta e no prazo: segue disponível', () => {
    expect(motivoCargaIndisponivel(proposta(), agora)).toBeNull();
  });

  it.each([
    ['fechado', 'Esta carga já foi fechada.'],
    ['cancelado', 'A empresa cancelou esta carga.'],
    ['expirado', 'O prazo desta carga acabou.'],
  ])('carga_status "%s" explica o motivo: "%s"', (carga_status, motivo) => {
    expect(motivoCargaIndisponivel(proposta({ carga_status }), agora)).toBe(motivo);
  });

  it('`aberto` com o prazo já vencido conta como expirada (relógio do aparelho à frente da API)', () => {
    expect(motivoCargaIndisponivel(proposta({ carga_expira_em: vencida }), agora)).toBe(
      'O prazo desta carga acabou.',
    );
  });

  it('o prazo no instante exato já venceu', () => {
    expect(motivoCargaIndisponivel(proposta({ carga_expira_em: agora.toISOString() }), agora)).toBe(
      'O prazo desta carga acabou.',
    );
  });

  it('proposta aceita nunca é "indisponível": a carga fechada é o resultado esperado', () => {
    expect(
      motivoCargaIndisponivel(proposta({ status: 'aceita', carga_status: 'fechado' }), agora),
    ).toBeNull();
    expect(
      motivoCargaIndisponivel(proposta({ status: 'aceita', carga_expira_em: vencida }), agora),
    ).toBeNull();
  });

  it('recusada e expirada com a carga fora do ar também mostram o motivo', () => {
    expect(motivoCargaIndisponivel(proposta({ status: 'recusada', carga_status: 'fechado' }))).toBe(
      'Esta carga já foi fechada.',
    );
    expect(
      motivoCargaIndisponivel(proposta({ status: 'expirada', carga_status: 'cancelado' })),
    ).toBe('A empresa cancelou esta carga.');
  });

  it('sem os campos da carga (backend antigo), não há como saber: segue disponível', () => {
    expect(
      motivoCargaIndisponivel({ status: 'pendente' } satisfies CargaDaProposta, agora),
    ).toBeNull();
  });

  it('um status novo da API (desconhecido) é tratado como carga não aberta, sem quebrar', () => {
    expect(motivoCargaIndisponivel(proposta({ carga_status: 'em_negociacao' }), agora)).toBe(
      'Esta carga não está mais aberta.',
    );
  });
});
