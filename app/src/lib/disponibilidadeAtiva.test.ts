import {
  escolherAtiva,
  lerEscolhaSalva,
  podeSerAtiva,
  serializarEscolha,
  type Disponibilidade,
} from './disponibilidadeAtiva';

// Relógio fixo: 21/10/2026, 12:00 de Brasília.
const agora = new Date('2026-10-21T12:00:00-03:00');

function criar(parcial: Partial<Disponibilidade> & { id: string }): Disponibilidade {
  return {
    local: { lat: -18.9186, lng: -48.2772 },
    raio_busca_km: 80,
    urgencia: 'normal',
    status: 'aberto',
    expira_em: '2026-10-22T12:00:00-03:00',
    criado_em: '2026-10-21T08:00:00-03:00',
    ...parcial,
  };
}

const recente = criar({ id: 'recente', criado_em: '2026-10-21T10:00:00-03:00' });
const antiga = criar({ id: 'antiga', criado_em: '2026-10-20T10:00:00-03:00' });
const vencida = criar({
  id: 'vencida',
  criado_em: '2026-10-21T11:00:00-03:00',
  expira_em: '2026-10-21T11:30:00-03:00',
});
const fechada = criar({ id: 'fechada', status: 'fechado', criado_em: '2026-10-21T11:30:00-03:00' });

describe('podeSerAtiva', () => {
  it('aceita só aberta e dentro do prazo (CT-10)', () => {
    expect(podeSerAtiva(recente, agora)).toBe(true);
    expect(podeSerAtiva(vencida, agora)).toBe(false);
    expect(podeSerAtiva(fechada, agora)).toBe(false);
    expect(podeSerAtiva(criar({ id: 'x', status: 'cancelado' }), agora)).toBe(false);
    expect(podeSerAtiva(criar({ id: 'x', status: 'expirado' }), agora)).toBe(false);
  });

  it('o prazo no instante exato já venceu', () => {
    expect(podeSerAtiva(criar({ id: 'x', expira_em: agora.toISOString() }), agora)).toBe(false);
  });
});

describe('escolherAtiva (D-PO-03)', () => {
  it('usa a escolhida quando ela está aberta e no prazo, mesmo não sendo a mais recente', () => {
    expect(escolherAtiva([recente, antiga], 'antiga', agora)?.id).toBe('antiga');
  });

  it('escolhida vencida: cai na mais recente aberta e no prazo', () => {
    expect(escolherAtiva([vencida, recente, antiga], 'vencida', agora)?.id).toBe('recente');
  });

  it('escolhida fechada ou fora da lista: cai na mais recente válida', () => {
    expect(escolherAtiva([fechada, antiga, recente], 'fechada', agora)?.id).toBe('recente');
    expect(escolherAtiva([antiga, recente], 'sumiu', agora)?.id).toBe('recente');
  });

  it('sem escolha: a mais recente por criado_em, qualquer que seja a ordem da lista', () => {
    expect(escolherAtiva([antiga, recente], null, agora)?.id).toBe('recente');
    expect(escolherAtiva([recente, antiga], null, agora)?.id).toBe('recente');
  });

  it('nenhuma aberta e no prazo: null', () => {
    expect(escolherAtiva([vencida, fechada], null, agora)).toBeNull();
    expect(escolherAtiva([], 'recente', agora)).toBeNull();
  });

  it('a mesma lista muda de resultado quando o relógio passa do prazo', () => {
    const lista = [recente, antiga];
    expect(escolherAtiva(lista, 'recente', agora)?.id).toBe('recente');
    const depois = new Date('2026-10-22T13:00:00-03:00');
    expect(escolherAtiva(lista, 'recente', depois)).toBeNull();
  });

  it('data de criação ilegível perde para uma legível', () => {
    const torta = criar({ id: 'torta', criado_em: 'ontem' });
    expect(escolherAtiva([torta, antiga], null, agora)?.id).toBe('antiga');
  });
});

describe('escolha guardada no aparelho', () => {
  it('ida e volta com a cópia da publicada', () => {
    const texto = serializarEscolha({ id: 'recente', publicada: recente });
    expect(lerEscolhaSalva(texto)).toEqual({ id: 'recente', publicada: recente });
  });

  it('ida e volta só com o id', () => {
    expect(lerEscolhaSalva(serializarEscolha({ id: 'antiga' }))).toEqual({ id: 'antiga' });
  });

  it('aceita um id puro, sem JSON', () => {
    expect(lerEscolhaSalva('abc-123')).toEqual({ id: 'abc-123' });
  });

  it('nada guardado, texto vazio ou JSON estragado viram null', () => {
    expect(lerEscolhaSalva(null)).toBeNull();
    expect(lerEscolhaSalva('   ')).toBeNull();
    expect(lerEscolhaSalva('{quebrado')).toBeNull();
    expect(lerEscolhaSalva('{"semId":true}')).toBeNull();
    expect(lerEscolhaSalva('{"id":""}')).toBeNull();
    expect(lerEscolhaSalva('[1,2]')).toBeNull();
  });

  it('descarta a cópia mal formada, mas mantém o id', () => {
    expect(lerEscolhaSalva('{"id":"a","publicada":{"id":"a"}}')).toEqual({ id: 'a' });
    expect(lerEscolhaSalva('{"id":"a","publicada":null}')).toEqual({ id: 'a' });
  });
});
