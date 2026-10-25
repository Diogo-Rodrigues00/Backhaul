// Carregamento sob demanda de código (ADR 0011): o chunk de uma tela pode não baixar (sem conexão,
// ou um deploy novo trocou os arquivos com o service worker ainda em cache). Uma nova tentativa
// resolve a maioria das quedas curtas; se acabar, a rejeição sobe e a tela mostra "Tentar de novo".

export interface OpcoesNovaTentativa {
  /** Quantas vezes repetir depois da primeira falha. */
  repeticoes?: number;
  /** Espera antes da primeira repetição; a segunda espera o dobro, e assim por diante. */
  esperaMs?: number;
}

const REPETICOES_PADRAO = 2;
const ESPERA_PADRAO_MS = 400;

/**
 * Chama `carregar` e, se rejeitar, chama de novo (um `import()` novo a cada vez: o Metro não guarda
 * a falha). Depois da última repetição rejeita com o último erro.
 */
export async function comNovaTentativa<T>(
  carregar: () => Promise<T>,
  { repeticoes = REPETICOES_PADRAO, esperaMs = ESPERA_PADRAO_MS }: OpcoesNovaTentativa = {},
): Promise<T> {
  for (let feitas = 0; ; feitas += 1) {
    try {
      return await carregar();
    } catch (erro) {
      if (feitas >= repeticoes) throw erro;
      await new Promise<void>((resolver) => setTimeout(resolver, esperaMs * 2 ** feitas));
    }
  }
}
