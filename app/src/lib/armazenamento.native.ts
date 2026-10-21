// iPhone (ADR 0006): expo-secure-store (Keychain). Se o Keychain falhar, cai na memória.
import * as SecureStore from 'expo-secure-store';

import { type Chave, memoriaReserva } from './armazenamentoComum';

export * from './armazenamentoComum';

export async function ler(chave: Chave): Promise<string | null> {
  try {
    const valor = await SecureStore.getItemAsync(chave);
    if (valor !== null) return valor;
  } catch {
    // Cai na reserva abaixo.
  }
  return memoriaReserva.get(chave) ?? null;
}

export async function gravar(chave: Chave, valor: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(chave, valor);
  } catch {
    memoriaReserva.set(chave, valor);
  }
}

export async function apagar(chave: Chave): Promise<void> {
  memoriaReserva.delete(chave);
  try {
    await SecureStore.deleteItemAsync(chave);
  } catch {
    // Já saiu da reserva; sem Keychain não há o que apagar.
  }
}
