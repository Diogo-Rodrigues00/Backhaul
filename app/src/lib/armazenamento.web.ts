// Web (ADR 0006): localStorage. Sem localStorage (pré-render em Node, modo privado) cai na memória.
import { type Chave, memoriaReserva } from './armazenamentoComum';

export * from './armazenamentoComum';

function depositoLocal(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Acessar localStorage pode lançar em alguns navegadores com bloqueio de dados do site.
    return null;
  }
}

export async function ler(chave: Chave): Promise<string | null> {
  const deposito = depositoLocal();
  if (deposito) {
    try {
      const valor = deposito.getItem(chave);
      if (valor !== null) return valor;
    } catch {
      // Cai na reserva abaixo.
    }
  }
  return memoriaReserva.get(chave) ?? null;
}

export async function gravar(chave: Chave, valor: string): Promise<void> {
  const deposito = depositoLocal();
  if (deposito) {
    try {
      deposito.setItem(chave, valor);
      return;
    } catch {
      // Cota cheia ou bloqueio: grava na reserva abaixo.
    }
  }
  memoriaReserva.set(chave, valor);
}

export async function apagar(chave: Chave): Promise<void> {
  memoriaReserva.delete(chave);
  const deposito = depositoLocal();
  try {
    deposito?.removeItem(chave);
  } catch {
    // Já saiu da reserva; o depósito indisponível não tem o que apagar.
  }
}
