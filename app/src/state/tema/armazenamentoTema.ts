// Armazenamento PROVISÓRIO só da chave de tema (web: localStorage).
// Mesmo contrato do src/lib/armazenamento do card 006 (ADR 0006): quando o 006 chegar em `front`,
// trocar o import em TemaProvider.tsx e apagar estes arquivos.

export const CHAVE_TEMA = 'backhaul.tema';

/** A web é pré-renderizada em Node (sem localStorage) e o navegador pode bloquear o acesso. */
function guardado(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export async function ler(chave: string): Promise<string | null> {
  try {
    return guardado()?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

export async function gravar(chave: string, valor: string): Promise<void> {
  try {
    guardado()?.setItem(chave, valor);
  } catch {
    // Sem armazenamento: a escolha vale só nesta sessão.
  }
}

export async function apagar(chave: string): Promise<void> {
  try {
    guardado()?.removeItem(chave);
  } catch {
    // Idem.
  }
}
