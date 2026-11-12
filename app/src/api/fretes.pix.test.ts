// Leitura tolerante do `pix` do POST /fretes/:id/pagamento (card 048): o campo é opcional e nunca se
// confia nele; campos desconhecidos são descartados.
import * as cliente from './cliente';
import { lerPix, pagarFrete } from './fretes';

const transacao = {
  id: 't-1',
  frete_id: 'f-1',
  valor_frete: 3500,
  percentual_comissao: 5,
  valor_comissao: 175,
  status_pagamento: 'pendente',
  criado_em: '2026-11-12T12:00:00.000Z',
};
const pixValido = {
  copia_e_cola: '00020126580014br.gov.bcb.pix0136abc',
  qr_code_base64: 'iVBORw0KGgo=',
  expira_em: '2026-11-12T12:30:00.000Z',
};

afterEach(() => jest.restoreAllMocks());

describe('lerPix', () => {
  it('aceita o formato do contrato e descarta campos desconhecidos', () => {
    expect(lerPix({ ...pixValido, cpf: '11144477735', extra: 1 })).toEqual(pixValido);
  });

  it('remove quebras de linha do base64', () => {
    expect(lerPix({ ...pixValido, qr_code_base64: 'iVBO\nRw0K\nGgo=' })?.qr_code_base64).toBe(
      'iVBORw0KGgo=',
    );
  });

  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['texto', 'pix'],
    ['sem copia e cola', { ...pixValido, copia_e_cola: undefined }],
    ['copia e cola vazio', { ...pixValido, copia_e_cola: '' }],
    ['copia e cola enorme', { ...pixValido, copia_e_cola: 'a'.repeat(5000) }],
    ['qr com caractere inválido', { ...pixValido, qr_code_base64: 'abc"><script>' }],
    ['qr vazio', { ...pixValido, qr_code_base64: '' }],
    ['qr enorme', { ...pixValido, qr_code_base64: 'A'.repeat(300_000) }],
    ['validade inválida', { ...pixValido, expira_em: 'ontem' }],
    ['validade ausente', { ...pixValido, expira_em: undefined }],
  ])('devolve undefined quando o pix é %s', (_nome, pix) => {
    expect(lerPix(pix)).toBeUndefined();
  });
});

describe('pagarFrete', () => {
  it('modo simulado: sem pix na resposta, sem pix no resultado', async () => {
    jest
      .spyOn(cliente, 'requisitar')
      .mockResolvedValue({ transacao: { ...transacao, status_pagamento: 'retido' } });
    const resposta = await pagarFrete('f-1');
    expect(resposta.pix).toBeUndefined();
    expect('pix' in resposta).toBe(false);
  });

  it('modo de teste: devolve a transação pendente e o pix válido', async () => {
    jest.spyOn(cliente, 'requisitar').mockResolvedValue({ transacao, pix: pixValido });
    expect(await pagarFrete('f-1')).toEqual({ transacao, pix: pixValido });
  });

  it('pix malformado: a tela segue como no modo simulado', async () => {
    jest
      .spyOn(cliente, 'requisitar')
      .mockResolvedValue({ transacao, pix: { ...pixValido, qr_code_base64: 'não é base64!' } });
    expect((await pagarFrete('f-1')).pix).toBeUndefined();
  });
});
