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

// GET /propostas/minhas (docs/api.md). Só motorista. Formato PLANO, `criado_em` DESC. A API ignora
// qualquer query (não há filtro `?status=`). `frete_id` só vem preenchido quando `status` é `aceita`.
// Erros: 401 · 403 não é motorista · 404 `perfil de motorista não encontrado`.
export type MinhaProposta = {
  id: string;
  tipo: TipoProposta;
  valor_proposto: Numerico;
  status: StatusProposta;
  criado_em: string;
  chamado_carga_id: string;
  chamado_disp_id: string;
  tipo_carga: string;
  valor_oferecido: Numerico;
  empresa: string;
  frete_id: string | null;
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

// ---------- Certificações do motorista (contrato: GET e POST /certificacoes/minhas) ----------
/** `pendente` aguarda o admin · `aprovada` libera cargas que exigem certificação · `vencida` passou da validade. */
export type SituacaoCertificacao = 'pendente' | 'aprovada' | 'vencida';

export type MinhaCertificacao = {
  id: string;
  certificacao_id: string;
  nome: string;
  numero_certificado: string;
  /** AAAA-MM-DD. */
  validade: string;
  validado_por_admin: boolean;
  situacao: SituacaoCertificacao;
  criado_em: string;
};
export type RespostaMinhasCertificacoes = { certificacoes: MinhaCertificacao[] };

/** POST /certificacoes/minhas: cadastra e reenvia (201 nos dois casos; 409 se já aprovada e vigente). */
export type CorpoEnviarCertificacao = {
  /** Id do catálogo (GET /certificacoes). */
  certificacao_id: string;
  /** Obrigatório, até 60 caracteres. */
  numero_certificado: string;
  /** AAAA-MM-DD, hoje ou futuro. */
  validade: string;
};
export type CertificacaoEnviada = {
  /** Id do registro do motorista (não é o id do catálogo). */
  id: string;
  certificacao_id: string;
  numero_certificado: string;
  validade: string;
  validado_por_admin: boolean;
  criado_em: string;
};
export type RespostaEnviarCertificacao = { certificacao: CertificacaoEnviada };

// ---------- Certificações: fila do admin (contrato: GET /certificacoes/pendentes) ----------
/**
 * Resposta de GET /certificacoes/pendentes como o contrato a documenta. Traz cpf e cnh do motorista.
 * Só o fetcher (`certificacoes.ts`) recebe este formato; nenhuma tela o recebe (ver CertificacaoPendente).
 */
export type CertificacaoPendenteDoContrato = {
  id: string;
  /** Nome da certificação (texto). */
  certificacao: string;
  numero_certificado: string;
  validade: string;
  criado_em: string;
  motorista: {
    id: string;
    nome_completo: string;
    cpf: string;
    cnh: string;
    veiculo_placa: string;
  };
};

/** Certificação da fila do admin, como as telas a recebem: sem cpf e sem cnh (card 032). */
export type CertificacaoPendente = {
  id: string;
  certificacao: string;
  numero_certificado: string;
  validade: string;
  criado_em: string;
  motorista: {
    id: string;
    nome_completo: string;
    veiculo_placa: string;
  };
};
export type RespostaCertificacoesPendentes = { certificacoes: CertificacaoPendente[] };

/** POST /certificacoes/pendentes/:id/responder. `recusar` apaga o registro: o motorista pode reenviar. */
export type AcaoCertificacao = 'aprovar' | 'recusar';
export type RespostaResponderCertificacao =
  | { certificacao: { id: string; validado_por_admin: true } }
  | { certificacao: { id: string; recusada: true } };

// ---------- Chat da proposta (contrato: GET e POST /propostas/:id/mensagens) ----------
export type Mensagem = {
  id: string;
  /** Id do USUÁRIO que enviou (o mesmo de GET /eu → usuario.id), não o do perfil. */
  remetente_id: string;
  texto: string;
  criado_em: string;
};
export type RespostaMensagens = { mensagens: Mensagem[] };

export type CorpoEnviarMensagem = {
  /** Até 1000 caracteres, sem telefone, e-mail ou link (o backend recusa com 400). */
  texto: string;
};
export type MensagemEnviada = Mensagem & { proposta_id: string };
export type RespostaEnviarMensagem = { mensagem: MensagemEnviada };

// ---------- Admin (contrato: GET /admin/resumo, /admin/fretes, /admin/usuarios) ----------
/** Valores em dinheiro vêm da API como estão; o app não recalcula comissão. */
export type ResumoAdmin = {
  motoristas: number;
  empresas: number;
  cargas_abertas: number;
  propostas_pendentes: number;
  fretes_aceitos: number;
  fretes_em_transito: number;
  fretes_entregues: number;
  certificacoes_pendentes: number;
  volume_liberado: Numerico;
  /** Soma só as transações liberadas (frete entregue). */
  comissao_total: Numerico;
  /** Soma as transações que ainda aguardam a entrega. */
  comissao_retida: Numerico;
};
export type RespostaResumoAdmin = { resumo: ResumoAdmin };

export type FreteAdmin = {
  id: string;
  tipo_carga: string;
  valor_final: Numerico;
  status_entrega: StatusEntrega;
  coleta_em: string | null;
  entrega_em: string | null;
  criado_em: string;
  empresa: string;
  motorista: string;
  veiculo_placa: string;
  /** null enquanto a empresa não pagou. */
  status_pagamento: StatusPagamento | null;
  /** null enquanto a empresa não pagou. */
  valor_comissao: Numerico | null;
};
export type RespostaFretesAdmin = { fretes: FreteAdmin[] };

export type UsuarioAdmin = {
  id: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criado_em: string;
  /** null para o admin, que não tem perfil de motorista nem de empresa. */
  nome: string | null;
};
export type RespostaUsuariosAdmin = { usuarios: UsuarioAdmin[] };
