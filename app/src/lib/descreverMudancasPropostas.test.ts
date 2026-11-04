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

  it('sem um dos retratos (primeira leitura ou erro), devolve null', () => {
    expect(descreverMudancasPropostas(undefined, [pendente])).toBeNull();
    expect(descreverMudancasPropostas([pendente], undefined)).toBeNull();
  });
});
