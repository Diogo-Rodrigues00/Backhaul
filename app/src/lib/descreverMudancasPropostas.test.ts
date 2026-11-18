import { descreverMudancasPropostas, type PropostaAcompanhada } from './descreverMudancasPropostas';

const pendente: PropostaAcompanhada = { id: 'a', tipo_carga: 'Grãos', status: 'pendente' };
const outra: PropostaAcompanhada = { id: 'b', tipo_carga: 'Soja', status: 'pendente' };

describe('descreverMudancasPropostas', () => {
  it('pendente que vira aceita: "Proposta aceita: Grãos"', () => {
    const atual = [{ ...pendente, status: 'aceita' as const }, outra];
    expect(descreverMudancasPropostas([pendente, outra], atual)).toBe('Proposta aceita: Grãos');
  });

  it('pendente que vira recusada ou expirada tem a frase do status', () => {
    expect(descreverMudancasPropostas([pendente], [{ ...pendente, status: 'recusada' }])).toBe(
      'Proposta recusada: Grãos',
    );
    expect(descreverMudancasPropostas([pendente], [{ ...pendente, status: 'expirada' }])).toBe(
      'Proposta expirada: Grãos',
    );
  });

  it('junta várias mudanças na ordem de `atual`, separadas por ponto', () => {
    const anterior = [pendente, outra];
    const atual = [
      { ...outra, status: 'recusada' as const },
      { ...pendente, status: 'aceita' as const },
    ];
    expect(descreverMudancasPropostas(anterior, atual)).toBe(
      'Proposta recusada: Soja. Proposta aceita: Grãos',
    );
  });

  it('nada muda quando o status fica igual', () => {
    expect(descreverMudancasPropostas([pendente], [pendente])).toBeNull();
  });

  it('proposta nova não é novidade: quem enviou foi o próprio motorista', () => {
    expect(descreverMudancasPropostas([pendente], [pendente, outra])).toBeNull();
  });

  it('mudança para pendente não é anunciada', () => {
    const anterior = [{ ...pendente, status: 'recusada' as const }];
    expect(descreverMudancasPropostas(anterior, [pendente])).toBeNull();
  });

  describe('carga que saiu do ar (card 050)', () => {
    const comCarga = (p: PropostaAcompanhada, carga_status: string): PropostaAcompanhada => ({
      ...p,
      carga_status,
      carga_expira_em: '2026-11-20T12:00:00.000Z',
    });

    it('carga que fecha, é cancelada ou expira sem a proposta mudar: "Carga indisponível: Grãos"', () => {
      for (const novo of ['fechado', 'cancelado', 'expirado']) {
        expect(
          descreverMudancasPropostas([comCarga(pendente, 'aberto')], [comCarga(pendente, novo)]),
        ).toBe('Carga indisponível: Grãos');
      }
    });

    it('se o status da proposta também mudou, vale a frase do status (uma frase por proposta)', () => {
      const anterior = [comCarga(pendente, 'aberto')];
      const atual = [comCarga({ ...pendente, status: 'recusada' }, 'cancelado')];
      expect(descreverMudancasPropostas(anterior, atual)).toBe('Proposta recusada: Grãos');
    });

    it('a proposta aceita fecha a carga e não vira "Carga indisponível"', () => {
      const anterior = [comCarga(pendente, 'aberto')];
      const atual = [comCarga({ ...pendente, status: 'aceita' }, 'fechado')];
      expect(descreverMudancasPropostas(anterior, atual)).toBe('Proposta aceita: Grãos');
    });

    it('carga que já estava fora do ar antes não é novidade', () => {
      const antes = [comCarga(pendente, 'fechado')];
      expect(descreverMudancasPropostas(antes, [comCarga(pendente, 'fechado')])).toBeNull();
    });

    it('sem os campos da carga (formato antigo da lista), nada é anunciado', () => {
      expect(descreverMudancasPropostas([pendente], [pendente])).toBeNull();
    });
  });

  it('sem um dos retratos (primeira leitura ou erro), devolve null', () => {
    expect(descreverMudancasPropostas(undefined, [pendente])).toBeNull();
    expect(descreverMudancasPropostas([pendente], undefined)).toBeNull();
  });
});
