import * as SecureStore from 'expo-secure-store';

// Armazenamento PROVISÓRIO só da chave de tema (iPhone). Ver nota em armazenamentoTema.ts.
// O SecureStore só aceita chaves com letras, números, ".", "-" e "_": "backhaul.tema" serve.

export const CHAVE_TEMA = 'backhaul.tema';

export async function ler(chave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(chave);
  } catch {
    return null;
  }
}

export async function gravar(chave: string, valor: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(chave, valor);
  } catch {
    // Sem armazenamento: a escolha vale só nesta sessão.
  }
}

export async function apagar(chave: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(chave);
  } catch {
    // Idem.
  }
}
