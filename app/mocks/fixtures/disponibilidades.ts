// POST /disponibilidades (docs/api.md) e GET /disponibilidades/minhas
// (PROPOSTA relatório 4b: ainda não existe no backend).
import type { DisponibilidadeDoMotorista, DisponibilidadePublicada } from '../../src/api/tipos';

import { daquiAHoras } from './datas';

export const DISPONIBILIDADE_ABERTA_ID = 'dddddddd-0000-4000-8000-000000000001';
export const DISPONIBILIDADE_EXPIRADA_ID = 'dddddddd-0000-4000-8000-000000000002';
// Segunda aberta, mais antiga que a primeira: dá ao motorista o que trocar em "Usar esta" (card 022).
export const DISPONIBILIDADE_ABERTA_ANTIGA_ID = 'dddddddd-0000-4000-8000-000000000004';

const local = { lat: -18.9186, lng: -48.2772 };

/** Resposta do POST /disponibilidades (201). */
export const disponibilidadePublicadaMock: DisponibilidadePublicada = {
  id: 'dddddddd-0000-4000-8000-000000000003',
  local,
  raio_busca_km: 80,
  urgencia: 'urgente',
  status: 'aberto',
  expira_em: daquiAHoras(24),
  criado_em: daquiAHoras(0),
};

// Ordem criado_em DESC. A segunda já expirou: o backend (proposta) devolve `expirado`
// calculado no SELECT, porque o banco nunca grava esse status.
export const disponibilidadesDoMotoristaMock: DisponibilidadeDoMotorista[] = [
  {
    id: DISPONIBILIDADE_ABERTA_ID,
    local,
    raio_busca_km: 80,
    urgencia: 'urgente',
    status: 'aberto',
    expira_em: daquiAHoras(20),
    criado_em: daquiAHoras(-4),
    propostas_pendentes: 1,
  },
  {
    id: DISPONIBILIDADE_ABERTA_ANTIGA_ID,
    local: { lat: -18.6456, lng: -48.1934 },
    raio_busca_km: 120,
    urgencia: 'normal',
    status: 'aberto',
    expira_em: daquiAHoras(30),
    criado_em: daquiAHoras(-20),
    propostas_pendentes: 0,
  },
  {
    id: DISPONIBILIDADE_EXPIRADA_ID,
    local: { lat: -19.7469, lng: -47.9319 },
    raio_busca_km: 50,
    urgencia: 'normal',
    status: 'expirado',
    expira_em: daquiAHoras(-12),
    criado_em: daquiAHoras(-40),
    propostas_pendentes: 0,
  },
];
