import {
  exemploDeData,
  MENSAGEM_A_PARTIR_DE_AMANHA,
  MENSAGEM_DATA_NO_PASSADO,
  mensagemDataInvalida,
  validarValidade,
} from './FormularioCertificacao';

/** Um "agora" com dia local e dia UTC escolhidos à mão, sem depender do fuso da máquina. */
function agoraCom(local: [number, number, number], iso: string): Date {
  return {
    getFullYear: () => local[0],
    getMonth: () => local[1] - 1,
    getDate: () => local[2],
    toISOString: () => iso,
  } as unknown as Date;
}

const data = (dia: string, mes: string, ano: string) => ({ dia, mes, ano });

// 04/11/2026 às 15h em Brasília (18h UTC): local e UTC no mesmo dia.
const DE_DIA = agoraCom([2026, 11, 4], '2026-11-04T18:00:00.000Z');
// 04/11/2026 às 22h em Brasília (01h UTC de 05/11): o backend já conta 05/11.
const A_NOITE = agoraCom([2026, 11, 4], '2026-11-05T01:00:00.000Z');

describe('validarValidade', () => {
  it('de dia: hoje e depois valem; ontem é passado', () => {
    expect(validarValidade(data('4', '11', '2026'), DE_DIA)).toBe(true);
    expect(validarValidade(data('5', '11', '2026'), DE_DIA)).toBe(true);
    expect(validarValidade(data('3', '11', '2026'), DE_DIA)).toBe(MENSAGEM_DATA_NO_PASSADO);
  });

  it('entre 21h e 24h em Brasília, "hoje" é barrado com uma mensagem simples; amanhã vale', () => {
    expect(validarValidade(data('4', '11', '2026'), A_NOITE)).toBe(MENSAGEM_A_PARTIR_DE_AMANHA);
    expect(validarValidade(data('5', '11', '2026'), A_NOITE)).toBe(true);
    // Ontem continua sendo passado, mesmo à noite.
    expect(validarValidade(data('3', '11', '2026'), A_NOITE)).toBe(MENSAGEM_DATA_NO_PASSADO);
  });

  it('data inexistente pede uma data válida, com exemplo do ano que vem', () => {
    expect(validarValidade(data('31', '2', '2027'), DE_DIA)).toBe(mensagemDataInvalida(DE_DIA));
    expect(mensagemDataInvalida(DE_DIA)).toBe(
      'Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.',
    );
    expect(exemploDeData(agoraCom([2030, 1, 1], '2030-01-01T12:00:00.000Z'))).toBe(
      'dia 31, mês 12, ano 2031',
    );
  });

  it('as mensagens não têm jargão técnico', () => {
    expect(MENSAGEM_A_PARTIR_DE_AMANHA).not.toMatch(/servidor|utc/i);
    // A regra real é o dia UTC, não um horário de Brasília: o texto não cita hora.
    expect(MENSAGEM_A_PARTIR_DE_AMANHA).toBe(
      'Neste horário, a validade precisa ser a partir de amanhã.',
    );
    expect(MENSAGEM_DATA_NO_PASSADO).not.toMatch(/servidor|utc/i);
  });
});
