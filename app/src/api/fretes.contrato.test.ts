// Contrato de GET /fretes/meus (card 044): o motorista nunca recebe comissão nem Pix, mesmo que a API
// os mande; o Pix da lista (copia e cola e validade, só com o pagamento pendente) passa só no formato certo.
import type { FreteDaEmpresa, FreteDoMotorista } from './tipos';
import { lerPixDaLista, paraFreteDoMotorista } from './fretes';

const base = {
  id: 'f-1',
  proposta_id: 'p-1',
  tipo_carga: 'Grãos',
  valor_final: 3500,
  status_entrega: 'em_transito',
  origem: { lat: -18.9141, lng: -48.2749 },
  destino: { lat: -19.7472, lng: -47.9381 },
  coleta_em: null,
  entrega_em: null,
  criado_em: '2026-10-14T19:00:00.000Z',
  status_pagamento: 'retido',
} as const;

describe('paraFreteDoMotorista', () => {
  it('mantém os campos que a tela usa, inclusive proposta_id, origem e destino', () => {
    const frete = paraFreteDoMotorista({
      ...base,
      empresa: { id: 'e-1', razao_social: 'Transportes Rápidos LTDA' },
    } as FreteDoMotorista);
    expect(frete).toEqual({
      ...base,
      empresa: { id: 'e-1', razao_social: 'Transportes Rápidos LTDA' },
    });
  });

  it('descarta comissão e Pix, mesmo que a resposta os traga (o motorista não vê comissão)', () => {
    const bruto = {
      ...base,
      empresa: { id: 'e-1', razao_social: 'Transportes Rápidos LTDA' },
      comissao: { percentual_comissao: 5, valor_comissao: 175, status_pagamento: 'retido' },
      pix_copia_cola: '00020126-codigo',
      pix_expira_em: '2026-12-01T00:00:00.000Z',
    } as unknown as FreteDoMotorista;
    const frete = paraFreteDoMotorista(bruto) as unknown as Record<string, unknown>;
    expect(frete).not.toHaveProperty('comissao');
    expect(frete).not.toHaveProperty('pix_copia_cola');
    expect(frete).not.toHaveProperty('pix_expira_em');
  });
});

describe('lerPixDaLista', () => {
  const expira = '2026-12-01T00:00:00.000Z';

  it('copia e cola e validade válidos: devolve os dois campos', () => {
    expect(
      lerPixDaLista({ pix_copia_cola: '00020126-codigo', pix_expira_em: expira }),
    ).toEqual({ copia_e_cola: '00020126-codigo', expira_em: expira });
  });

  it('null nos dois campos (pagamento não pendente): nada', () => {
    expect(lerPixDaLista({ pix_copia_cola: null, pix_expira_em: null })).toBeUndefined();
  });

  it('código vazio, longo demais ou que não é texto: nada', () => {
    expect(lerPixDaLista({ pix_copia_cola: '', pix_expira_em: expira })).toBeUndefined();
    expect(
      lerPixDaLista({ pix_copia_cola: 'a'.repeat(4001), pix_expira_em: expira }),
    ).toBeUndefined();
    expect(
      lerPixDaLista({ pix_copia_cola: 123 as unknown as string, pix_expira_em: expira }),
    ).toBeUndefined();
  });

  it('validade que não é data: nada (o código sem validade não entra na tela)', () => {
    expect(
      lerPixDaLista({ pix_copia_cola: '00020126-codigo', pix_expira_em: 'amanhã' }),
    ).toBeUndefined();
    expect(
      lerPixDaLista({ pix_copia_cola: '00020126-codigo', pix_expira_em: null }),
    ).toBeUndefined();
  });

  it('aceita o frete da empresa completo (tipos)', () => {
    const frete = {
      ...base,
      motorista: { id: 'm', nome_completo: 'João', veiculo_tipo: 'carreta', veiculo_placa: 'ABC1D23' },
      comissao: null,
      pix_copia_cola: null,
      pix_expira_em: null,
    } as FreteDaEmpresa;
    expect(lerPixDaLista(frete)).toBeUndefined();
  });
});
