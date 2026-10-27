// Versão de referência do armazenamento: só memória. As plataformas usam
// `armazenamento.web.ts` (localStorage) e `armazenamento.native.ts` (expo-secure-store).
// Existe para o TypeScript resolver `@/lib/armazenamento`; Metro e Jest escolhem o arquivo da
// plataforma, então este não roda em teste: excluído da cobertura de propósito.
/* istanbul ignore file */
import { type Chave, memoriaReserva } from './armazenamentoComum';

export { CHAVES } from './armazenamentoComum';
export type { Chave } from './armazenamentoComum';

export async function ler(chave: Chave): Promise<string | null> {
  return memoriaReserva.get(chave) ?? null;
}

export async function gravar(chave: Chave, valor: string): Promise<void> {
  memoriaReserva.set(chave, valor);
}

export async function apagar(chave: Chave): Promise<void> {
  memoriaReserva.delete(chave);
}
