// Estado em memória do mock "do fluxo" (card 030). Só o E2E e2e/fluxo-completo.spec.ts usa isto.
//
// Por que existe: os handlers de mocks/handlers/* não guardam nada entre chamadas (aceitar uma
// proposta não cria frete na lista, pagar não muda `status_pagamento`). O roteiro da demo precisa
// de duas janelas enxergando o mesmo mundo, então este módulo guarda cargas, disponibilidades,
// propostas, fretes e pagamentos como o backend real guardaria.
//
// Como convive com os outros specs sem mudar o comportamento deles: o servidor de mock (porta 4010)
// é um só e o `dist/` tem a URL dele embutida. Por isso o estado só vale para quem se identifica
// como "do fluxo": token `fluxo-*` (ou, no login e no cadastro, e-mail `@fluxo.test`). Qualquer
// outra requisição cai nos handlers sem estado de sempre (ver handlers/comEstado.ts).
//
// Reinício: `POST /__mock/reset` (só no servidor de mocks, nunca no app).
import { randomUUID } from 'node:crypto';

import type {
  Coordenadas,
  StatusChamado,
  StatusEntrega,
  StatusPagamento,
  StatusProposta,
  TipoProposta,
  TipoUsuario,
  Urgencia,
} from '../src/api/tipos';
import { certificacoesMock } from './fixtures/certificacoes';

export const DOMINIO_FLUXO = '@fluxo.test';
export const PREFIXO_TOKEN_FLUXO = 'fluxo-';

/**
 * Percentual de comissão que o mock "do fluxo" devolve. É de propósito diferente dos 5% do backend:
 * se o app calculasse ou fixasse a comissão, o E2E (que confere 7,5% e o valor que veio da API)
 * falharia. O app só exibe o que a API devolve.
 */
export const PERCENTUAL_COMISSAO_FLUXO = 7.5;

export const MOPP_CLASSE_3 = certificacoesMock[0];

export type UsuarioFluxo = {
  id: string;
  email: string;
  tipo: Exclude<TipoUsuario, 'admin'>;
  token: string;
  nome: string;
  criadoEm: string;
  // Motorista.
  cpf?: string;
  veiculoTipo?: string;
  veiculoPlaca?: string;
  capacidadeKg?: number;
  certificacoes?: { certificacaoId: string; nome: string; validade: string; aprovada: boolean }[];
};

export type CargaFluxo = {
  id: string;
  empresaId: string;
  tipo_carga: string;
  origem: Coordenadas;
  destino: Coordenadas;
  peso_kg: number;
  valor_oferecido: number;
  urgencia: Urgencia;
  status: StatusChamado;
  certificacao_requerida_id: string | null;
  expira_em: string;
  criado_em: string;
};

export type DisponibilidadeFluxo = {
  id: string;
  motoristaId: string;
  local: Coordenadas;
  raio_busca_km: number;
  urgencia: Urgencia;
  status: StatusChamado;
  expira_em: string;
  criado_em: string;
};

export type PropostaFluxo = {
  id: string;
  cargaId: string;
  dispId: string;
  motoristaId: string;
  tipo: TipoProposta;
  valor_proposto: number;
  status: StatusProposta;
  criado_em: string;
};

export type FreteFluxo = {
  id: string;
  propostaId: string;
  cargaId: string;
  empresaId: string;
  motoristaId: string;
  valor_final: number;
  status_entrega: StatusEntrega;
  coleta_em: string | null;
  entrega_em: string | null;
  criado_em: string;
};

export type TransacaoFluxo = {
  id: string;
  freteId: string;
  valor_frete: number;
  percentual_comissao: number;
  valor_comissao: number;
  status_pagamento: StatusPagamento;
  criado_em: string;
};

export type EstadoFluxo = {
  usuarios: UsuarioFluxo[];
  cargas: CargaFluxo[];
  disponibilidades: DisponibilidadeFluxo[];
  propostas: PropostaFluxo[];
  fretes: FreteFluxo[];
  transacoes: TransacaoFluxo[];
  sequenciaCadastro: number;
};

const HORA_MS = 60 * 60 * 1000;

export const ARAGUARI = { lat: -18.6456, lng: -48.1934 };
export const UBERLANDIA = { lat: -18.9186, lng: -48.2772 };

export function agoraIso(): string {
  return new Date().toISOString();
}

function daquiAHoras(horas: number): string {
  return new Date(Date.now() + horas * HORA_MS).toISOString();
}

export const ID_EMPRESA_FLUXO = '11111111-0000-4000-8000-00000000f001';
export const ID_MOTORISTA_MOPP_FLUXO = '22222222-0000-4000-8000-00000000f001';
export const ID_CARGA_GRAOS_FLUXO = 'cccccccc-0000-4000-8000-00000000f001';

function semente(): EstadoFluxo {
  const criadoEm = agoraIso();
  return {
    usuarios: [
      {
        id: ID_EMPRESA_FLUXO,
        email: `empresa${DOMINIO_FLUXO}`,
        tipo: 'empresa',
        token: `${PREFIXO_TOKEN_FLUXO}empresa`,
        nome: 'Transportes Rápidos LTDA',
        criadoEm,
      },
      {
        // O motorista da demo que TEM MOPP: vê as cargas que exigem a certificação.
        id: ID_MOTORISTA_MOPP_FLUXO,
        email: `joao${DOMINIO_FLUXO}`,
        tipo: 'motorista',
        token: `${PREFIXO_TOKEN_FLUXO}motorista`,
        nome: 'João da Silva',
        criadoEm,
        cpf: '11122233344',
        veiculoTipo: 'carreta',
        veiculoPlaca: 'ABC1D23',
        capacidadeKg: 15000,
        certificacoes: [
          {
            certificacaoId: MOPP_CLASSE_3?.id ?? '',
            nome: MOPP_CLASSE_3?.nome ?? 'MOPP',
            validade: '2030-05-01',
            aprovada: true,
          },
        ],
      },
    ],
    // Uma carga comum, sem certificação: é o que o motorista SEM MOPP enxerga.
    cargas: [
      {
        id: ID_CARGA_GRAOS_FLUXO,
        empresaId: ID_EMPRESA_FLUXO,
        tipo_carga: 'Grãos',
        origem: ARAGUARI,
        destino: UBERLANDIA,
        peso_kg: 22000,
        valor_oferecido: 4200.5,
        urgencia: 'normal',
        status: 'aberto',
        certificacao_requerida_id: null,
        expira_em: daquiAHoras(72),
        criado_em: criadoEm,
      },
    ],
    disponibilidades: [],
    propostas: [],
    fretes: [],
    transacoes: [],
    sequenciaCadastro: 0,
  };
}

export const estado: EstadoFluxo = semente();

/** Volta ao ponto de partida (sem recriar o objeto: os handlers guardam a referência). */
export function reiniciarEstado(): void {
  Object.assign(estado, semente());
}

export function novoId(): string {
  return randomUUID();
}

export function usuarioPorToken(token: string): UsuarioFluxo | undefined {
  return estado.usuarios.find((u) => u.token === token);
}

export function usuarioPorEmail(email: string): UsuarioFluxo | undefined {
  return estado.usuarios.find((u) => u.email === email.toLowerCase());
}

export function usuarioPorId(id: string): UsuarioFluxo | undefined {
  return estado.usuarios.find((u) => u.id === id);
}

/** Motorista cadastrado pelo formulário (sem nenhuma certificação). */
export function registrarMotorista(dados: {
  email: string;
  nome: string;
  cpf: string;
  veiculoTipo: string;
  veiculoPlaca: string;
  capacidadeKg: number;
}): UsuarioFluxo {
  estado.sequenciaCadastro += 1;
  const usuario: UsuarioFluxo = {
    id: `77777777-0000-4000-8000-${String(estado.sequenciaCadastro).padStart(12, '0')}`,
    email: dados.email.toLowerCase(),
    tipo: 'motorista',
    token: `${PREFIXO_TOKEN_FLUXO}cadastrado-${estado.sequenciaCadastro}`,
    nome: dados.nome,
    criadoEm: agoraIso(),
    cpf: dados.cpf,
    veiculoTipo: dados.veiculoTipo,
    veiculoPlaca: dados.veiculoPlaca,
    capacidadeKg: dados.capacidadeKg,
    certificacoes: [],
  };
  estado.usuarios.push(usuario);
  return usuario;
}

/** Distância em linha reta (haversine), 1 casa decimal, como o PostGIS do backend entrega. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const paraRad = (g: number) => (g * Math.PI) / 180;
  const raioTerra = 6371.0088;
  const dLat = paraRad(b.lat - a.lat);
  const dLng = paraRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRad(a.lat)) * Math.cos(paraRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * raioTerra * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** O motorista pode pegar a carga? Sem exigência, sim; com exigência, só com a certificação aprovada e na validade. */
export function motoristaPodePegar(motorista: UsuarioFluxo, carga: CargaFluxo): boolean {
  if (carga.certificacao_requerida_id === null) return true;
  return (motorista.certificacoes ?? []).some(
    (c) =>
      c.certificacaoId === carga.certificacao_requerida_id &&
      c.aprovada &&
      Date.parse(c.validade) > Date.now(),
  );
}

export function cargaAbertaENaoVencida(carga: CargaFluxo): boolean {
  return carga.status === 'aberto' && Date.parse(carga.expira_em) > Date.now();
}

/** Comissão em centavos inteiros, meio centavo sobe (mesma conta do backend). */
export function calcularComissao(valorFrete: number, percentual: number): number {
  const centavos = Math.round(valorFrete * 100);
  return Math.round((centavos * percentual) / 100) / 100;
}

export const ORDEM_URGENCIA: Record<Urgencia, number> = { critico: 0, urgente: 1, normal: 2 };
