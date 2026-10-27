// GET /fretes/meus (as duas formas), PATCH /fretes/:id/status e POST /fretes/:id/pagamento.
import type {
  FreteDaEmpresa,
  FreteDoMotorista,
  RespostaPagamento,
  RespostaStatusFrete,
} from '../../src/api/tipos';

import { daquiAHoras } from './datas';

export const FRETE_ACEITO_ID = 'ffffffff-0000-4000-8000-000000000001';
export const FRETE_EM_TRANSITO_ID = 'ffffffff-0000-4000-8000-000000000002';
export const FRETE_ENTREGUE_ID = 'ffffffff-0000-4000-8000-000000000003';

const empresa = {
  id: '11111111-1111-4111-8111-111111111111',
  razao_social: 'Transportes Rápidos LTDA',
};
const motorista = {
  id: '22222222-2222-4222-8222-222222222222',
  nome_completo: 'João da Silva',
  veiculo_tipo: 'carreta',
  veiculo_placa: 'ABC1D23',
};

const base = [
  {
    id: FRETE_ACEITO_ID,
    tipo_carga: 'Produtos inflamáveis',
    valor_final: 3200,
    status_entrega: 'aceito',
    coleta_em: null,
    entrega_em: null,
    criado_em: daquiAHoras(-1),
    status_pagamento: null,
  },
  {
    id: FRETE_EM_TRANSITO_ID,
    tipo_carga: 'Grãos',
    valor_final: 3500,
    status_entrega: 'em_transito',
    coleta_em: daquiAHoras(-6),
    entrega_em: null,
    criado_em: daquiAHoras(-20),
    status_pagamento: 'retido',
  },
  {
    id: FRETE_ENTREGUE_ID,
    tipo_carga: 'Material de construção',
    valor_final: 2800,
    status_entrega: 'entregue',
    coleta_em: daquiAHoras(-70),
    entrega_em: daquiAHoras(-60),
    criado_em: daquiAHoras(-90),
    status_pagamento: 'liberado',
  },
] as const;

/** GET /fretes/meus para o motorista: cada frete traz a empresa. */
export const fretesDoMotoristaMock: FreteDoMotorista[] = base.map((frete) => ({
  ...frete,
  empresa,
}));

/** GET /fretes/meus para a empresa: mesmos campos, mas com o motorista no lugar da empresa. */
export const fretesDaEmpresaMock: FreteDaEmpresa[] = base.map((frete) => ({
  ...frete,
  motorista,
}));

/** Resposta do PATCH /fretes/:id/status (200). */
export function respostaStatusFreteMock(
  freteId: string,
  status: 'em_transito' | 'entregue',
): RespostaStatusFrete {
  return {
    frete: {
      id: freteId,
      valor_final: 3200,
      status_entrega: status,
      coleta_em: daquiAHoras(-1),
      entrega_em: status === 'entregue' ? daquiAHoras(0) : null,
      status_pagamento: status === 'entregue' ? 'liberado' : null,
    },
  };
}

/**
 * Resposta do POST /fretes/:id/pagamento (201). A comissão (5% no backend) é um dado da
 * fixture, só para a tela ter o que exibir: o app nunca calcula nem fixa esse percentual.
 */
export function respostaPagamentoMock(freteId: string): RespostaPagamento {
  return {
    transacao: {
      id: 'eeeeeeee-0000-4000-8000-000000000001',
      frete_id: freteId,
      valor_frete: 3500,
      percentual_comissao: 5,
      valor_comissao: 175,
      status_pagamento: 'retido',
      criado_em: daquiAHoras(0),
    },
  };
}
