// O mock do cadastro (MSW) repete as regras e os textos do backend (card 037): documento com dígito
// verificador errado, placa fora do padrão e os 409 reais. Sem isso, o app passaria nos testes e
// quebraria contra a API de verdade.
import { urlMock } from '../../mocks/node';

type RespostaJson = { status: number; corpo: { erros?: string[]; erro?: string } };

async function enviar(caminho: string, corpo: Record<string, unknown>): Promise<RespostaJson> {
  const resposta = await fetch(urlMock(caminho), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: (await resposta.json()) as RespostaJson['corpo'] };
}

const MOTORISTA = {
  email: 'mock.cadastro@mock.test',
  senha: 'senha12345',
  nome_completo: 'Maria Souza',
  cpf: '987.654.321-00',
  cnh: '11122233344',
  veiculo_tipo: 'truck',
  veiculo_placa: 'ABC1D23',
  capacidade_kg: 8000,
};

const EMPRESA = {
  email: 'mock.empresa@mock.test',
  senha: 'senha12345',
  razao_social: 'Cargas Sul LTDA',
  cnpj: '12.345.678/0001-95',
};

describe('POST /cadastro/motorista (mock)', () => {
  it('CPF com dígito verificador errado: 400 "cpf inválido"', async () => {
    const r = await enviar('/cadastro/motorista', { ...MOTORISTA, cpf: '529.982.247-26' });
    expect(r.status).toBe(400);
    expect(r.corpo.erros).toEqual(['cpf inválido']);
  });

  it('CPF de sequência repetida: 400 "cpf inválido"', async () => {
    const r = await enviar('/cadastro/motorista', { ...MOTORISTA, cpf: '111.111.111-11' });
    expect(r.corpo.erros).toEqual(['cpf inválido']);
  });

  it('CPF com 10 dígitos ou com letra: 400 "cpf deve ter 11 dígitos"', async () => {
    const curto = await enviar('/cadastro/motorista', { ...MOTORISTA, cpf: '5299822472' });
    expect(curto.corpo.erros).toEqual(['cpf deve ter 11 dígitos']);
    const letra = await enviar('/cadastro/motorista', { ...MOTORISTA, cpf: 'abc52998224725' });
    expect(letra.corpo.erros).toEqual(['cpf deve ter 11 dígitos']);
  });

  it.each(['AB12345', 'ABCD123', 'ABC12D3', ''])(
    'placa "%s": 400 com o texto da API',
    async (placa) => {
      const r = await enviar('/cadastro/motorista', { ...MOTORISTA, veiculo_placa: placa });
      expect(r.status).toBe(400);
      expect(r.corpo.erros).toEqual(['veiculo_placa inválida (use ABC1234 ou ABC1D23)']);
    },
  );

  it('aceita CPF com ou sem pontuação e placa com hífen e minúscula', async () => {
    const r = await enviar('/cadastro/motorista', {
      ...MOTORISTA,
      email: 'mock.formatos@mock.test',
      cpf: '52998224725',
      veiculo_placa: 'abc-1d23',
    });
    expect(r.status).toBe(201);
  });

  it('409 com o texto do backend: "email já cadastrado" e "cpf já cadastrado"', async () => {
    const porEmail = await enviar('/cadastro/motorista', {
      ...MOTORISTA,
      email: 'existente@mock.test',
    });
    expect(porEmail.status).toBe(409);
    expect(porEmail.corpo.erro).toBe('email já cadastrado');

    const primeiro = await enviar('/cadastro/motorista', {
      ...MOTORISTA,
      email: 'mock.cpf1@mock.test',
      cpf: '123.456.789-09',
    });
    expect(primeiro.status).toBe(201);
    const repetido = await enviar('/cadastro/motorista', {
      ...MOTORISTA,
      email: 'mock.cpf2@mock.test',
      cpf: '123.456.789-09',
    });
    expect(repetido.status).toBe(409);
    expect(repetido.corpo.erro).toBe('cpf já cadastrado');
  });
});

describe('POST /cadastro/empresa (mock)', () => {
  it('CNPJ com dígito verificador errado ou repetido: 400 "cnpj inválido"', async () => {
    const errado = await enviar('/cadastro/empresa', { ...EMPRESA, cnpj: '12.345.678/0001-96' });
    expect(errado.status).toBe(400);
    expect(errado.corpo.erros).toEqual(['cnpj inválido']);
    const repetido = await enviar('/cadastro/empresa', { ...EMPRESA, cnpj: '00.000.000/0000-00' });
    expect(repetido.corpo.erros).toEqual(['cnpj inválido']);
  });

  it('CNPJ com 13 dígitos: 400 "cnpj deve ter 14 dígitos"', async () => {
    const r = await enviar('/cadastro/empresa', { ...EMPRESA, cnpj: '12.345.678/0001-9' });
    expect(r.corpo.erros).toEqual(['cnpj deve ter 14 dígitos']);
  });

  it('CNPJ válido: 201; e-mail repetido: 409 "email já cadastrado"', async () => {
    const ok = await enviar('/cadastro/empresa', EMPRESA);
    expect(ok.status).toBe(201);
    const repetido = await enviar('/cadastro/empresa', {
      ...EMPRESA,
      email: 'existente@mock.test',
    });
    expect(repetido.status).toBe(409);
    expect(repetido.corpo.erro).toBe('email já cadastrado');
  });

  it('409 "cnpj já cadastrado" para CNPJ repetido (com ou sem pontuação); o e-mail vem primeiro', async () => {
    const cnpj = '11.222.333/0001-81';
    const primeira = await enviar('/cadastro/empresa', {
      ...EMPRESA,
      email: 'mock.cnpj1@mock.test',
      cnpj,
    });
    expect(primeira.status).toBe(201);

    const repetido = await enviar('/cadastro/empresa', {
      ...EMPRESA,
      email: 'mock.cnpj2@mock.test',
      cnpj: '11222333000181',
    });
    expect(repetido.status).toBe(409);
    expect(repetido.corpo.erro).toBe('cnpj já cadastrado');

    const emailEcnpj = await enviar('/cadastro/empresa', {
      ...EMPRESA,
      email: 'existente@mock.test',
      cnpj,
    });
    expect(emailEcnpj.corpo.erro).toBe('email já cadastrado');
  });
});
