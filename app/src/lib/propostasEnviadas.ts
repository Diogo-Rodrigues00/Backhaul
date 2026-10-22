// Plano B das propostas enviadas (D-PO-05): enquanto `GET /propostas/minhas` (proposta 4a) não
// existe no backend, o aparelho lembra quais cargas já receberam proposta deste motorista. O card
// 025 chama `registrarPropostaEnviada` no 201 de `POST /propostas`; "Cargas próximas" lê a lista
// para marcar "Proposta enviada". Quando a rota existir, a lista da API prevalece (ver a tela).
// A lista pertence a quem a fez: `entrar` e `sair` a apagam, como a disponibilidade ativa (ADR 0006).
import { CHAVES, gravar, ler } from './armazenamento';

export type TipoPropostaEnviada = 'aceite' | 'contraproposta';

/** Uma proposta feita neste aparelho. `enviadaEm` é ISO 8601. */
export interface PropostaEnviada {
  cargaId: string;
  enviadaEm: string;
  tipo: TipoPropostaEnviada;
}

function eTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor !== '';
}

function eProposta(valor: unknown): valor is PropostaEnviada {
  if (typeof valor !== 'object' || valor === null) return false;
  const p = valor as Record<string, unknown>;
  return (
    eTexto(p.cargaId) && eTexto(p.enviadaEm) && (p.tipo === 'aceite' || p.tipo === 'contraproposta')
  );
}

/** Texto gravado no aparelho. */
export function serializarPropostasEnviadas(lista: readonly PropostaEnviada[]): string {
  return JSON.stringify(lista);
}

/**
 * Lê o que `serializarPropostasEnviadas` gravou. Texto estragado ou de outro formato devolve lista
 * vazia (a tela só deixa de marcar); itens inválidos são descartados, os bons ficam.
 */
export function lerListaPropostasEnviadas(texto: string | null): PropostaEnviada[] {
  if (texto === null || texto.trim() === '') return [];
  try {
    const dados: unknown = JSON.parse(texto);
    return Array.isArray(dados) ? dados.filter(eProposta) : [];
  } catch {
    return [];
  }
}

/** As propostas feitas neste aparelho, da mais antiga para a mais nova. */
export async function lerPropostasEnviadas(): Promise<PropostaEnviada[]> {
  return lerListaPropostasEnviadas(await ler(CHAVES.propostasEnviadas));
}

/**
 * Guarda que o motorista fez uma proposta para a carga (card 025, no 201). Uma entrada por carga:
 * a mais nova substitui a anterior. `agora` entra por parâmetro para os testes usarem data fixa.
 */
export async function registrarPropostaEnviada(
  cargaId: string,
  tipo: TipoPropostaEnviada,
  agora: Date = new Date(),
): Promise<void> {
  const atual = await lerPropostasEnviadas();
  const demais = atual.filter((proposta) => proposta.cargaId !== cargaId);
  const nova: PropostaEnviada = { cargaId, enviadaEm: agora.toISOString(), tipo };
  await gravar(CHAVES.propostasEnviadas, serializarPropostasEnviadas([...demais, nova]));
}
