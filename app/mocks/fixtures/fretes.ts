// GET /fretes/meus (as duas formas), PATCH /fretes/:id/status e POST /fretes/:id/pagamento.
import type {
  ComissaoDoFrete,
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

// Coordenadas dos centros das cidades da lista fixa (src/data/cidades.ts), como a carga as guarda; São
// Paulo não está na lista, então o cartão mostra as coordenadas (fallback do card 044).
const UBERLANDIA = { lat: -18.9141, lng: -48.2749 };
const ARAGUARI = { lat: -18.6456, lng: -48.1934 };
const UBERABA = { lat: -19.7472, lng: -47.9381 };
const SAO_PAULO = { lat: -23.55, lng: -46.63 };

/** Comissão de 5% sobre o valor do frete, como a API calcula (fixture: nunca usada pelo app). */
function comissaoDe(
  valorFrete: number,
  status: ComissaoDoFrete['status_pagamento'],
): ComissaoDoFrete {
  return {
    percentual_comissao: 5,
    valor_comissao: Math.round(valorFrete * 5) / 100,
    status_pagamento: status,
  };
}

const base = [
  {
    id: FRETE_ACEITO_ID,
    proposta_id: 'pppppppp-0000-4000-8000-000000000001',
    tipo_carga: 'Produtos inflamáveis',
    valor_final: 3200,
    status_entrega: 'aceito',
    origem: UBERLANDIA,
    destino: SAO_PAULO,
    coleta_em: null,
    entrega_em: null,
    criado_em: daquiAHoras(-1),
    status_pagamento: null,
    comissao: null,
  },
  {
    id: FRETE_EM_TRANSITO_ID,
    proposta_id: 'pppppppp-0000-4000-8000-000000000002',
    tipo_carga: 'Grãos',
    valor_final: 3500,
    status_entrega: 'em_transito',
    origem: UBERLANDIA,
    destino: UBERABA,
    coleta_em: daquiAHoras(-6),
    entrega_em: null,
    criado_em: daquiAHoras(-20),
    status_pagamento: 'retido',
    comissao: comissaoDe(3500, 'retido'),
  },
  {
    id: FRETE_ENTREGUE_ID,
    proposta_id: 'pppppppp-0000-4000-8000-000000000003',
    tipo_carga: 'Material de construção',
    valor_final: 2800,
    status_entrega: 'entregue',
    origem: ARAGUARI,
    destino: UBERLANDIA,
    coleta_em: daquiAHoras(-70),
    entrega_em: daquiAHoras(-60),
    criado_em: daquiAHoras(-90),
    status_pagamento: 'liberado',
    comissao: comissaoDe(2800, 'liberado'),
  },
] as const;

/** GET /fretes/meus para o motorista: cada frete traz a empresa. Sem comissão: a API não a envia a ele. */
export const fretesDoMotoristaMock: FreteDoMotorista[] = base.map(
  ({ comissao: _comissao, ...frete }) => ({
    ...frete,
    empresa,
  }),
);

/**
 * GET /fretes/meus para a empresa: mesmos campos, com o motorista no lugar da empresa. Padrão sem
 * comissão em nenhum frete (`comissao: null`, Pix ausente): é o que as telas e os E2E de antes
 * esperam. Os testes que precisam da comissão paga usam `fretesDaEmpresaComComissaoMock`.
 */
export const fretesDaEmpresaMock: FreteDaEmpresa[] = base.map(
  ({ comissao: _comissao, ...frete }) => ({
    ...frete,
    motorista,
    comissao: null,
    pix_copia_cola: null,
    pix_expira_em: null,
  }),
);

/**
 * GET /fretes/meus para a empresa com a comissão de cada frete pago (como a API devolve depois do
 * pagamento; `comissao: null` no aceito). Usado para testar que a comissão vem da lista (card 044).
 */
export const fretesDaEmpresaComComissaoMock: FreteDaEmpresa[] = base.map(
  ({ comissao, ...frete }) => ({
    ...frete,
    motorista,
    comissao,
    pix_copia_cola: null,
    pix_expira_em: null,
  }),
);

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
