// Regra da disponibilidade ativa (D-PO-03) e o formato guardado no aparelho (ADR 0006).
// Funções puras: o relógio entra por parâmetro, o que deixa os testes com data fixa.
import type { Numerico } from './numeros';
import type { StatusDisponibilidade, Urgencia } from './rotulos';
import { estaVencido } from './vencimento';

/**
 * Disponibilidade do motorista, no formato de `POST /disponibilidades` e da proposta 4b
 * (`GET /disponibilidades/minhas`). `propostas_pendentes` só existe na lista da 4b.
 * Lib não importa api: o tipo é estrutural e casa com `DisponibilidadeDoMotorista`.
 */
export interface Disponibilidade {
  id: string;
  local: { lat: number; lng: number };
  raio_busca_km: Numerico;
  urgencia: Urgencia;
  status: StatusDisponibilidade;
  expira_em: string;
  criado_em: string;
  propostas_pendentes?: number;
}

/** O que fica em `backhaul.disponibilidadeAtiva`: a escolhida e, no plano B, ela inteira. */
export interface EscolhaSalva {
  id: string;
  /**
   * Cópia da disponibilidade publicada neste aparelho (card 023). Só serve ao plano B, enquanto
   * `GET /disponibilidades/minhas` não existe: então ela é a única entrada da lista.
   */
  publicada?: Disponibilidade;
}

/** Aberta e dentro do prazo: a única que pode ser a ativa (CT-10: aberta vencida é "Expirada"). */
export function podeSerAtiva(disponibilidade: Disponibilidade, agora: Date = new Date()): boolean {
  return (
    disponibilidade.status === 'aberto' &&
    !estaVencido(disponibilidade.status, disponibilidade.expira_em, agora)
  );
}

function instante(texto: string): number {
  const tempo = Date.parse(texto);
  return Number.isNaN(tempo) ? Number.NEGATIVE_INFINITY : tempo;
}

/**
 * Regra D-PO-03: a escolhida pelo motorista, se ainda estiver aberta e no prazo; senão a mais
 * recente (`criado_em`) aberta e no prazo; senão `null`. Não depende da ordem da lista.
 */
export function escolherAtiva(
  disponibilidades: readonly Disponibilidade[],
  escolhidaId: string | null,
  agora: Date = new Date(),
): Disponibilidade | null {
  const validas = disponibilidades.filter((item) => podeSerAtiva(item, agora));
  const escolhida = escolhidaId === null ? undefined : validas.find((i) => i.id === escolhidaId);
  if (escolhida) return escolhida;
  let maisRecente: Disponibilidade | null = null;
  for (const item of validas) {
    if (maisRecente === null || instante(item.criado_em) > instante(maisRecente.criado_em)) {
      maisRecente = item;
    }
  }
  return maisRecente;
}

// Id puro, como um uuid: letras, números e hífen.
const ID_PURO = /^[\w-]+$/;

function eTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor !== '';
}

function eDisponibilidade(valor: unknown): valor is Disponibilidade {
  if (typeof valor !== 'object' || valor === null) return false;
  const d = valor as Record<string, unknown>;
  const local = d.local as Record<string, unknown> | null | undefined;
  return (
    eTexto(d.id) &&
    typeof local === 'object' &&
    local !== null &&
    typeof local.lat === 'number' &&
    typeof local.lng === 'number' &&
    (typeof d.raio_busca_km === 'number' || typeof d.raio_busca_km === 'string') &&
    eTexto(d.urgencia) &&
    eTexto(d.status) &&
    eTexto(d.expira_em) &&
    eTexto(d.criado_em)
  );
}

/** Texto gravado no aparelho. Sem `publicada`, só o id escolhido. */
export function serializarEscolha(escolha: EscolhaSalva): string {
  return JSON.stringify(escolha);
}

/**
 * Lê o que `serializarEscolha` gravou. Texto estragado ou de outro formato devolve `null` (o app
 * cai na regra padrão); um id puro (sem JSON) é aceito como escolha sem cópia.
 */
export function lerEscolhaSalva(texto: string | null): EscolhaSalva | null {
  if (texto === null || texto.trim() === '') return null;
  const bruto = texto.trim();
  if (!bruto.startsWith('{')) return ID_PURO.test(bruto) ? { id: bruto } : null;
  try {
    const dados: unknown = JSON.parse(bruto);
    if (typeof dados !== 'object' || dados === null) return null;
    const { id, publicada } = dados as Record<string, unknown>;
    if (!eTexto(id)) return null;
    return eDisponibilidade(publicada) ? { id, publicada } : { id };
  } catch {
    return null;
  }
}
