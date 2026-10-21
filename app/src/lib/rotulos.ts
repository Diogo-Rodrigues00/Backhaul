// Rótulos em pt-BR dos valores de enum do contrato (docs/api.md). Sempre texto, nunca só cor (D-PO-13).
// Valores de enum vêm da API em minúsculo, sem acento (CLAUDE.md da raiz).

export type Urgencia = 'normal' | 'urgente' | 'critico';
export type StatusCarga = 'aberto' | 'fechado' | 'cancelado' | 'expirado';
export type StatusDisponibilidade = 'aberto' | 'fechado' | 'cancelado' | 'expirado';
export type StatusProposta = 'pendente' | 'aceita' | 'recusada' | 'expirada';
export type TipoProposta = 'aceite' | 'contraproposta';
export type StatusEntrega = 'aceito' | 'em_transito' | 'entregue' | 'cancelado';
export type StatusPagamento = 'pendente' | 'retido' | 'liberado' | 'estornado';

export type ProximoPassoFrete = { status: 'em_transito' | 'entregue'; rotulo: string };

// Valor fora do mapa (enum novo na API) mostra traço, não "undefined".
const SEM_ROTULO = '—';

const ROTULOS_URGENCIA: Record<Urgencia, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  critico: 'Crítico',
};

const ROTULOS_STATUS_CARGA: Record<StatusCarga, string> = {
  aberto: 'Aberta',
  fechado: 'Fechada',
  cancelado: 'Cancelada',
  expirado: 'Expirada',
};

const ROTULOS_STATUS_DISPONIBILIDADE: Record<StatusDisponibilidade, string> = {
  aberto: 'Aberta',
  fechado: 'Fechada',
  cancelado: 'Cancelada',
  expirado: 'Expirada',
};

const ROTULOS_STATUS_PROPOSTA: Record<StatusProposta, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  expirada: 'Expirada',
};

const ROTULOS_TIPO_PROPOSTA: Record<TipoProposta, string> = {
  aceite: 'Aceita o valor',
  contraproposta: 'Contraproposta',
};

const ROTULOS_STATUS_ENTREGA: Record<StatusEntrega, string> = {
  aceito: 'Aceito',
  em_transito: 'Em trânsito',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// D-PO-07: null (ainda não pago) tem rótulo próprio; os demais valores do enum saem em pt-BR.
const ROTULOS_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  retido: 'Pago, retido até a entrega',
  liberado: 'Liberado ao motorista',
  estornado: 'Estornado',
};

// D-PO-09: um único botão com o próximo passo. Entregue e cancelado não têm botão.
const PROXIMO_PASSO_FRETE: Record<StatusEntrega, ProximoPassoFrete | null> = {
  aceito: { status: 'em_transito', rotulo: 'Iniciar transporte' },
  em_transito: { status: 'entregue', rotulo: 'Confirmar entrega' },
  entregue: null,
  cancelado: null,
};

export function rotuloUrgencia(urgencia: Urgencia): string {
  return ROTULOS_URGENCIA[urgencia] ?? SEM_ROTULO;
}

export function rotuloStatusCarga(status: StatusCarga): string {
  return ROTULOS_STATUS_CARGA[status] ?? SEM_ROTULO;
}

export function rotuloStatusDisponibilidade(status: StatusDisponibilidade): string {
  return ROTULOS_STATUS_DISPONIBILIDADE[status] ?? SEM_ROTULO;
}

export function rotuloStatusProposta(status: StatusProposta): string {
  return ROTULOS_STATUS_PROPOSTA[status] ?? SEM_ROTULO;
}

export function rotuloTipoProposta(tipo: TipoProposta): string {
  return ROTULOS_TIPO_PROPOSTA[tipo] ?? SEM_ROTULO;
}

export function rotuloStatusEntrega(status: StatusEntrega): string {
  return ROTULOS_STATUS_ENTREGA[status] ?? SEM_ROTULO;
}

export function rotuloPagamento(status: StatusPagamento | null): string {
  if (status === null) return 'Aguardando pagamento';
  return ROTULOS_PAGAMENTO[status] ?? SEM_ROTULO;
}

export function proximoPassoFrete(status: StatusEntrega): ProximoPassoFrete | null {
  const passo = PROXIMO_PASSO_FRETE[status];
  return passo ? { ...passo } : null;
}
