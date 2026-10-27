// Formatos exatos de docs/api.md: POST /cargas, GET /cargas/minhas e GET /cargas/proximas.
import type { Carga, CargaDaEmpresa, CargaProxima } from '../../src/api/tipos';

import { certificacoesMock } from './certificacoes';
import { daquiAHoras } from './datas';

const mopp3 = certificacoesMock[0];
const mopp3Id = mopp3?.id ?? null;
const mopp3Nome = mopp3?.nome ?? null;

/** IDs fixos: os handlers de propostas usam o da primeira carga. */
export const CARGA_URGENTE_ID = 'cccccccc-0000-4000-8000-000000000001';
export const CARGA_NORMAL_ID = 'cccccccc-0000-4000-8000-000000000002';
export const CARGA_FECHADA_ID = 'cccccccc-0000-4000-8000-000000000003';
/** Aberta com o prazo já vencido: aparece como "Expirada" (CT-10). */
export const CARGA_VENCIDA_ID = 'cccccccc-0000-4000-8000-000000000005';

const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };
const araguari = { lat: -18.6456, lng: -48.1935 };
const goiania = { lat: -16.6869, lng: -49.2648 };
const catalao = { lat: -18.1656, lng: -47.944 };
const tupaciguara = { lat: -18.5866, lng: -48.6985 };
const monteCarmelo = { lat: -18.7302, lng: -47.4912 };
const araxa = { lat: -19.5902, lng: -46.9438 };

export const cargasDaEmpresaMock: CargaDaEmpresa[] = [
  {
    id: CARGA_URGENTE_ID,
    tipo_carga: 'Produtos inflamáveis',
    origem: uberlandia,
    destino: uberaba,
    peso_kg: 8000,
    valor_oferecido: 3500,
    urgencia: 'urgente',
    status: 'aberto',
    certificacao_requerida_id: mopp3Id,
    expira_em: daquiAHoras(30),
    criado_em: daquiAHoras(-5),
    certificacao_exigida: mopp3Nome,
    total_propostas: 3,
  },
  {
    id: CARGA_NORMAL_ID,
    tipo_carga: 'Grãos',
    origem: araguari,
    destino: uberlandia,
    peso_kg: 22000,
    valor_oferecido: 4200.5,
    urgencia: 'normal',
    status: 'aberto',
    certificacao_requerida_id: null,
    expira_em: daquiAHoras(72),
    criado_em: daquiAHoras(-26),
    certificacao_exigida: null,
    total_propostas: 0,
  },
  {
    id: CARGA_FECHADA_ID,
    tipo_carga: 'Material de construção',
    origem: uberaba,
    destino: araguari,
    peso_kg: 15000,
    valor_oferecido: 2800,
    urgencia: 'critico',
    status: 'fechado',
    certificacao_requerida_id: null,
    expira_em: daquiAHoras(10),
    criado_em: daquiAHoras(-50),
    certificacao_exigida: null,
    total_propostas: 1,
  },
  {
    id: CARGA_VENCIDA_ID,
    tipo_carga: 'Bobinas de aço',
    origem: uberlandia,
    destino: araguari,
    peso_kg: 18000,
    valor_oferecido: 5200,
    urgencia: 'normal',
    status: 'aberto',
    certificacao_requerida_id: null,
    expira_em: daquiAHoras(-2),
    criado_em: daquiAHoras(-80),
    certificacao_exigida: null,
    total_propostas: 0,
  },
];

/** Resposta do POST /cargas (201): a carga recém-publicada, sem os campos de GET /minhas. */
export const cargaPublicadaMock: Carga = {
  id: 'cccccccc-0000-4000-8000-000000000004',
  tipo_carga: 'Produtos inflamáveis',
  origem: uberlandia,
  destino: uberaba,
  peso_kg: 8000,
  valor_oferecido: 3500,
  urgencia: 'urgente',
  status: 'aberto',
  certificacao_requerida_id: null,
  expira_em: daquiAHoras(48),
  criado_em: daquiAHoras(0),
};

export const cargaProximaUrgente: CargaProxima = {
  id: CARGA_URGENTE_ID,
  tipo_carga: 'Produtos inflamáveis',
  empresa: 'Transportes Rápidos LTDA',
  peso_kg: 8000,
  valor_oferecido: 3500,
  urgencia: 'urgente',
  distancia_origem_km: 12.4,
  certificacao_exigida: mopp3Nome,
  origem: uberlandia,
  destino: uberaba,
  expira_em: daquiAHoras(30),
};

export const cargaProximaNormal: CargaProxima = {
  id: CARGA_NORMAL_ID,
  tipo_carga: 'Grãos',
  empresa: 'Transportes Rápidos LTDA',
  peso_kg: 22000,
  valor_oferecido: 4200.5,
  urgencia: 'normal',
  distancia_origem_km: 48.9,
  certificacao_exigida: null,
  origem: araguari,
  destino: uberlandia,
  expira_em: daquiAHoras(72),
};

function cargaProxima(
  numero: number,
  dados: Omit<CargaProxima, 'id' | 'empresa' | 'certificacao_exigida'> &
    Partial<Pick<CargaProxima, 'empresa' | 'certificacao_exigida'>>,
): CargaProxima {
  return {
    id: `cccccccc-0000-4000-8000-0000000000${numero}`,
    empresa: 'Transportes Rápidos LTDA',
    certificacao_exigida: null,
    ...dados,
  };
}

// Dez cargas na ordem do contrato: urgência (critico, urgente, normal) e, dentro de cada uma, a
// distância (mais perto primeiro). A busca de exemplo parte de Uberlândia. A lista é a dos
// critérios de Lighthouse do card 024 ("10 cargas na fixture").
const outrasCargasProximas: CargaProxima[] = [
  cargaProxima(10, {
    tipo_carga: 'Insumos hospitalares',
    empresa: 'Distribuidora Triângulo',
    peso_kg: 3200,
    valor_oferecido: 6800,
    urgencia: 'critico',
    distancia_origem_km: 4.3,
    origem: uberlandia,
    destino: goiania,
    expira_em: daquiAHoras(6),
  }),
  cargaProxima(11, {
    tipo_carga: 'Combustível a granel',
    peso_kg: 28000,
    valor_oferecido: 7400,
    urgencia: 'critico',
    distancia_origem_km: 31.2,
    certificacao_exigida: mopp3Nome,
    origem: araguari,
    destino: catalao,
    expira_em: daquiAHoras(9),
  }),
  cargaProxima(12, {
    tipo_carga: 'Fertilizantes ensacados',
    empresa: 'AgroCerrado Insumos',
    peso_kg: 24000,
    valor_oferecido: 4800,
    urgencia: 'urgente',
    distancia_origem_km: 43.1,
    origem: tupaciguara,
    destino: catalao,
    expira_em: daquiAHoras(20),
  }),
  cargaProxima(13, {
    tipo_carga: 'Cimento ensacado',
    empresa: 'Casa Forte Atacado',
    peso_kg: 26000,
    valor_oferecido: 3900,
    urgencia: 'urgente',
    distancia_origem_km: 57,
    origem: tupaciguara,
    destino: uberlandia,
    expira_em: daquiAHoras(26),
  }),
  cargaProxima(14, {
    tipo_carga: 'Bebidas paletizadas',
    empresa: 'Distribuidora Triângulo',
    peso_kg: 12000,
    valor_oferecido: 2100,
    urgencia: 'normal',
    distancia_origem_km: 62.4,
    origem: araguari,
    destino: uberaba,
    expira_em: daquiAHoras(40),
  }),
  cargaProxima(15, {
    tipo_carga: 'Ração animal',
    empresa: 'AgroCerrado Insumos',
    peso_kg: 21000,
    valor_oferecido: 3300,
    urgencia: 'normal',
    distancia_origem_km: 71.3,
    origem: monteCarmelo,
    destino: uberlandia,
    expira_em: daquiAHoras(60),
  }),
  cargaProxima(16, {
    tipo_carga: 'Material de construção',
    empresa: 'Casa Forte Atacado',
    peso_kg: 15000,
    valor_oferecido: 1900,
    urgencia: 'normal',
    distancia_origem_km: 78.6,
    origem: uberaba,
    destino: araxa,
    expira_em: daquiAHoras(80),
  }),
  cargaProxima(17, {
    tipo_carga: 'Eletrodomésticos',
    empresa: 'Distribuidora Triângulo',
    peso_kg: 9000,
    valor_oferecido: 2600,
    urgencia: 'normal',
    distancia_origem_km: 79.8,
    origem: monteCarmelo,
    destino: goiania,
    expira_em: daquiAHoras(90),
  }),
];

/**
 * Dez cargas na ordem do contrato (critico, urgente, normal; dentro de cada uma, a mais perto
 * primeiro). As duas originais (`cargaProximaUrgente` e `cargaProximaNormal`) mantêm o lugar que
 * a distância lhes dá.
 */
export const cargasProximasMock: CargaProxima[] = [
  ...outrasCargasProximas.slice(0, 2),
  cargaProximaUrgente,
  ...outrasCargasProximas.slice(2, 4),
  cargaProximaNormal,
  ...outrasCargasProximas.slice(4),
];
