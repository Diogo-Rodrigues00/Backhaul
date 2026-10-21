// Versão de referência do armazenamento: só memória. As plataformas usam
// `armazenamento.web.ts` (localStorage) e `armazenamento.native.ts` (expo-secure-store).
export * from './armazenamentoComum';
import { type Chave, memoriaReserva } from './armazenamentoComum';

export async function ler(chave: Chave): Promise<string | null> {
  return memoriaReserva.get(chave) ?? null;
}

export async function gravar(chave: Chave, valor: string): Promise<void> {
  memoriaReserva.set(chave, valor);
}

export async function apagar(chave: Chave): Promise<void> {
  memoriaReserva.delete(chave);
}
