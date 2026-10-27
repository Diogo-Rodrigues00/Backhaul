import { ErroApi } from './erros';
import { descreverCarga, lerErroDaProposta, rotuloAceitar } from './fazerProposta';

function erro(status: number, mensagem: string, tipo: 'mensagem' | 'validacao' = 'mensagem') {
  return new ErroApi({ tipo, status, mensagens: [mensagem] });
}

describe('textos', () => {
  it('rotuloAceitar usa a moeda do contrato', () => {
    expect(rotuloAceitar(3500)).toBe('Aceitar R$ 3.500,00');
    expect(rotuloAceitar('4200.50')).toBe('Aceitar R$ 4.200,50');
  });

  it('descreverCarga junta tipo e rota', () => {
    expect(descreverCarga('Grãos', 'Araguari - MG', 'Uberlândia - MG')).toBe(
      'Grãos, Araguari - MG → Uberlândia - MG',
    );
  });
});

describe('lerErroDaProposta', () => {
  it('409 da contraproposta única', () => {
    expect(
      lerErroDaProposta(erro(409, 'você já fez a contraproposta única para esta carga')),
    ).toEqual({
      desfecho: 'contraproposta-repetida',
      mensagem: 'você já fez a contraproposta única para esta carga',
    });
  });

  it('409 de carga que não está mais aberta', () => {
    expect(lerErroDaProposta(erro(409, 'carga não está mais aberta para propostas')).desfecho).toBe(
      'carga-indisponivel',
    );
  });

  it('403 de certificação', () => {
    expect(lerErroDaProposta(erro(403, 'motorista sem a certificação exigida'))).toEqual({
      desfecho: 'sem-certificacao',
      mensagem: 'motorista sem a certificação exigida',
    });
  });

  it('404 de disponibilidade e de carga', () => {
    expect(lerErroDaProposta(erro(404, 'disponibilidade não encontrada')).desfecho).toBe(
      'disponibilidade',
    );
    expect(lerErroDaProposta(erro(404, 'carga não encontrada')).desfecho).toBe(
      'carga-indisponivel',
    );
  });

  it('400 fica no diálogo com as mensagens juntas', () => {
    const lido = lerErroDaProposta(
      new ErroApi({ tipo: 'validacao', status: 400, mensagens: ['a deve ser x', 'b deve ser y'] }),
    );
    expect(lido).toEqual({ desfecho: 'outro', mensagem: 'a deve ser x b deve ser y' });
  });

  it('falha de rede, 500 e erro desconhecido usam o texto padrão e ficam no diálogo', () => {
    expect(lerErroDaProposta(ErroApi.falha(500))).toEqual({
      desfecho: 'outro',
      mensagem: 'Algo deu errado. Tente de novo.',
    });
    expect(lerErroDaProposta(new Error('boom'))).toEqual({
      desfecho: 'outro',
      mensagem: 'Algo deu errado. Tente de novo.',
    });
  });

  it('sessão expirada não é tratada aqui (o cliente já leva ao login)', () => {
    const sessao = new ErroApi({
      tipo: 'sessao',
      status: 401,
      mensagens: ['Sua sessão expirou. Entre de novo.'],
    });
    expect(lerErroDaProposta(sessao).desfecho).toBe('outro');
  });
});
