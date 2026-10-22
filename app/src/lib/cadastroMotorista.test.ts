import { CAMPOS_DA_API, paraCorpoCadastroMotorista, type DadosCadastroMotorista } from './cadastroMotorista';

const DADOS: DadosCadastroMotorista = {
  email: '  joao@exemplo.com ',
  senha: 'senhaSegura8',
  nomeCompleto: ' João da Silva ',
  cpf: '123.456.789-01',
  cnh: '11122233344',
  veiculoTipo: 'carreta',
  veiculoPlaca: 'ABC1D23',
  capacidadeKg: '15000',
};

describe('paraCorpoCadastroMotorista', () => {
  it('mapeia cada campo para o nome da API e envia a capacidade como número', () => {
    expect(paraCorpoCadastroMotorista(DADOS)).toEqual({
      email: 'joao@exemplo.com',
      senha: 'senhaSegura8',
      nome_completo: 'João da Silva',
      cpf: '123.456.789-01',
      cnh: '11122233344',
      veiculo_tipo: 'carreta',
      veiculo_placa: 'ABC1D23',
      capacidade_kg: 15000,
    });
  });

  it('lê a capacidade digitada com vírgula decimal', () => {
    expect(paraCorpoCadastroMotorista({ ...DADOS, capacidadeKg: '3500,5' }).capacidade_kg).toBe(
      3500.5,
    );
  });

  it('envia a senha exatamente como foi digitada, sem trim', () => {
    expect(paraCorpoCadastroMotorista({ ...DADOS, senha: ' abcdefgh ' }).senha).toBe(' abcdefgh ');
  });

  it('capacidade que não é número lança erro em vez de enviar 0', () => {
    expect(() => paraCorpoCadastroMotorista({ ...DADOS, capacidadeKg: 'abc' })).toThrow(
      'capacidadeKg sem número',
    );
  });
});

describe('CAMPOS_DA_API', () => {
  it('leva cada campo da API ao nome do campo no formulário (D-PO-14)', () => {
    expect(CAMPOS_DA_API).toEqual({
      email: 'email',
      senha: 'senha',
      nome_completo: 'nomeCompleto',
      cpf: 'cpf',
      cnh: 'cnh',
      veiculo_tipo: 'veiculoTipo',
      veiculo_placa: 'veiculoPlaca',
      capacidade_kg: 'capacidadeKg',
    });
  });
});
