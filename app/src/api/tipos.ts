// Tipos da API escritos à mão a partir de docs/api.md (não há OpenAPI) e das propostas
// 4a/4b de docs/front/relatorio-api-inicial.md. Enums iguais ao contrato (minúsculos).
// Valores NUMERIC do Postgres podem chegar como texto: tipo `Numerico`, lidos com
// paraNumero() (src/lib/numeros.ts). Ao enviar, sempre number.
import type { Numerico } from '@/lib/numeros';

export type { Numerico };

// ---------- Enums ----------
export type TipoUsuario = 'motorista' | 'empresa' | 'admin';
export type Urgencia = 'normal' | 'urgente' | 'critico';
export type StatusChamado = 'aberto' | 'em_negociacao' | 'fechado' | 'expirado' | 'cancelado';
export type TipoProposta = 'aceite' | 'contraproposta';
export type StatusProposta = 'pendente' | 'aceita' | 'recusada' | 'expirada';
export type StatusEntrega = 'aceito' | 'em_transito' | 'entregue' | 'cancelado';
export type StatusPagamento = 'pendente' | 'retido' | 'liberado' | 'estornado';
export type AcaoResposta = 'aceitar' | 'recusar';

export type Coordenadas = { lat: number; lng: number };

// ---------- Saúde ----------
// GET /saude: 200 { status: 'ok', banco: 'conectado' } · 503 { status: 'erro', banco: 'indisponivel' }
export type RespostaSaude = { status: 'ok'; banco: 'conectado' };

// ---------- Sessão e cadastro ----------
export type CorpoLogin = { email: string; senha: string };
export type RespostaLogin = { token: string; tipo: TipoUsuario };

export type Usuario = {
  id: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criado_em: string;
  nome: string;
};
export type RespostaEu = { usuario: Usuario };

export type CorpoCadastroEmpresa = {
  email: string;
  senha: string;
  razao_social: string;
  cnpj: string;
};
export type CorpoCadastroMotorista = {
  email: string;
  senha: string;
  nome_completo: string;
  cpf: string;
  cnh: string;
  veiculo_tipo: string;
  veiculo_placa: string;
  capacidade_kg: number;
};
export type UsuarioCriado = {
  id: string;
  email: string;
  tipo: TipoUsuario;
  criado_em: string;
};
export type RespostaCadastro = { usuario: UsuarioCriado };

// ---------- Certificações ----------
export type Certificacao = {
  id: string;
  nome: string;
  /** null quando a certificação não tem classe ONU. */
  classificacao_onu: string | null;
};
export type RespostaCertificacoes = { certificacoes: Certificacao[] };

// ---------- Cargas ----------
export type CorpoPublicarCarga = {
  tipo_carga: string;
  origem: Coordenadas;
  destino: Coordenadas;
  peso_kg: number;
  valor_oferecido: number;
  /** Opcional: a API assume 'normal'. */
  urgencia?: Urgencia;
  /** Opcional: ausente ou null = qualquer motorista. */
  certificacao_requerida_id?: string | null;
  /** ISO 8601 no futuro. */
  expira_em: string;
};

export type Carga = {
  id: string;
  tipo_carga: string;
  origem: Coordenadas;
  destino: Coordenadas;
  peso_kg: Numerico;
  valor_oferecido: Numerico;
  urgencia: Urgencia;
  status: StatusChamado;
  certificacao_requerida_id: string | null;
  expira_em: string;
  criado_em: string;
};
export type RespostaPublicarCarga = { carga: Carga };

/** GET /cargas/minhas: os campos de Carga mais nome da certificação e total de propostas. */
export type CargaDaEmpresa = Carga & {
  /** null quando a carga não exige certificação. */
  certificacao_exigida: string | null;
  total_propostas: number;
};
export type RespostaMinhasCargas = { cargas: CargaDaEmpresa[] };

/** GET /cargas/proximas (motorista). */
export type CargaProxima = {
  id: string;
  tipo_carga: string;
  empresa: string;
  peso_kg: Numerico;
  valor_oferecido: Numerico;
  urgencia: Urgencia;
  /** Km em linha reta, 1 casa decimal. */
  distancia_origem_km: Numerico;
  certificacao_exigida: string | null;
  origem: Coordenadas;
  destino: Coordenadas;
  expira_em: string;
};
export type RespostaCargasProximas = { cargas: CargaProxima[] };
export type ParametrosCargasProximas = {
  lat: number;
  lng: number;
  /** Maior que zero e até 500. */
  raio_km: number;
};

// ---------- Disponibilidades ----------
export type CorpoPublicarDisponibilidade = {
  local: Coordenadas;
  /** Opcional: a API assume 50. Maior que zero e até 500. */
  raio_busca_km?: number;
  /** Opcional: a API assume 'normal'. */
  urgencia?: Urgencia;
  expira_em: string;
};
export type DisponibilidadePublicada = {
  id: string;
  local: Coordenadas;
  raio_busca_km: Numerico;
  urgencia: Urgencia;
  status: StatusChamado;
  expira_em: string;
  criado_em: string;
};
export type RespostaPublicarDisponibilidade = { disponibilidade: DisponibilidadePublicada };

// PROPOSTA relatório 4b: GET /disponibilidades/minhas (ainda não existe no backend; conferir
// quando entrar em docs/api.md). Só motorista. Ordem criado_em DESC. Query: nenhuma.
// Texto da proposta: "`status` deve sair como `expirado` quando `status = 'aberto'` e
// `expira_em <= now()`, porque o banco nunca grava `expirado`" (o backend calcula no SELECT).
// Erros: 401 · 403 não é motorista · 404 perfil de motorista não encontrado.
export type DisponibilidadeDoMotorista = DisponibilidadePublicada & {
  propostas_pendentes: number;
};
export type RespostaMinhasDisponibilidades = { disponibilidades: DisponibilidadeDoMotorista[] };

// ---------- Propostas ----------
export type CorpoFazerProposta = {
  chamado_carga_id: string;
  chamado_disp_id: string;
  tipo: TipoProposta;
  /** Obrigatório na contraproposta; ignorado no aceite. */
  valor_proposto?: number;
};
export type PropostaCriada = {
  id: string;
  chamado_carga_id: string;
  chamado_disp_id: string;
  tipo: TipoProposta;
  valor_proposto: Numerico;
  status: StatusProposta;
  criado_em: string;
};
export type RespostaFazerProposta = { proposta: PropostaCriada };

export type CertificacaoDoMotorista = {
  nome: string;
  /** Pode vir como 'YYYY-MM-DD' (contrato) ou como ISO com hora (pg devolve Date); ver relatório, seção 1. */
  validade: string;
  validado_por_admin: boolean;
};
export type MotoristaDaProposta = {
  id: string;
  nome_completo: string;
  veiculo_tipo: string;
  veiculo_placa: string;
  capacidade_kg: Numerico;
  certificacoes: CertificacaoDoMotorista[];
};
/** GET /cargas/:id/propostas (empresa dona). */
export type PropostaRecebida = {
  id: string;
  tipo: TipoProposta;
  valor_proposto: Numerico;
  status: StatusProposta;
  criado_em: string;
  motorista: MotoristaDaProposta;
};
export type RespostaPropostasDaCarga = { propostas: PropostaRecebida[] };

export type RespostaResponderRecusar = { proposta: { id: string; status: 'recusada' } };
export type FreteCriado = {
  id: string;
  proposta_id: string;
  valor_final: Numerico;
  status_entrega: StatusEntrega;
  criado_em: string;
};
export type RespostaResponderAceitar = { frete: FreteCriado };
export type RespostaResponder = RespostaResponderRecusar | RespostaResponderAceitar;

// PROPOSTA relatório 4a: GET /propostas/minhas (ainda não existe no backend; conferir quando
// entrar em docs/api.md). Só motorista. Ordem criado_em DESC. Query opcional
// `?status=pendente|aceita|recusada`. Incluir `carga.status` e `carga.expira_em` permite à tela
// mostrar "carga fechou" sem outra chamada.
// Erros: 401 · 403 não é motorista · 404 `perfil de motorista não encontrado`.
export type CargaDaMinhaProposta = {
  id: string;
  tipo_carga: string;
  empresa: string;
  origem: Coordenadas;
  destino: Coordenadas;
  valor_oferecido: Numerico;
  urgencia: Urgencia;
  status: StatusChamado;
  certificacao_exigida: string | null;
  expira_em: string;
};
export type MinhaProposta = {
  id: string;
  tipo: TipoProposta;
  valor_proposto: Numerico;
  status: StatusProposta;
  criado_em: string;
  disponibilidade_id: string;
  carga: CargaDaMinhaProposta;
};
export type RespostaMinhasPropostas = { propostas: MinhaProposta[] };

// ---------- Fretes ----------
type FreteBase = {
  id: string;
  tipo_carga: string;
  valor_final: Numerico;
  status_entrega: StatusEntrega;
  /** null até o frete ir para em_transito. */
  coleta_em: string | null;
  /** null até o frete ser entregue. */
  entrega_em: string | null;
  criado_em: string;
  /** null enquanto a empresa não pagou. */
  status_pagamento: StatusPagamento | null;
};
/** GET /fretes/meus para o motorista: traz os dados da empresa. */
export type FreteDoMotorista = FreteBase & {
  empresa: { id: string; razao_social: string };
};
/** GET /fretes/meus para a empresa: traz os dados do motorista. */
export type FreteDaEmpresa = FreteBase & {
  motorista: {
    id: string;
    nome_completo: string;
    veiculo_tipo: string;
    veiculo_placa: string;
  };
};
export type Frete = FreteDoMotorista | FreteDaEmpresa;
export type RespostaMeusFretes = { fretes: Frete[] };

export type CorpoStatusFrete = { status_entrega: Exclude<StatusEntrega, 'aceito' | 'cancelado'> };
/** PATCH /fretes/:id/status. A API aceita 'cancelado' no corpo, mas nunca permite a transição (409). */
export type RespostaStatusFrete = {
  frete: {
    id: string;
    valor_final: Numerico;
    status_entrega: StatusEntrega;
    coleta_em: string | null;
    entrega_em: string | null;
    status_pagamento: StatusPagamento | null;
  };
};

/** POST /fretes/:id/pagamento. A comissão vem sempre da API: nunca fixar o percentual no app. */
export type Transacao = {
  id: string;
  frete_id: string;
  valor_frete: Numerico;
  percentual_comissao: Numerico;
  valor_comissao: Numerico;
  status_pagamento: StatusPagamento;
  criado_em: string;
};
export type RespostaPagamento = { transacao: Transacao };
