// Única leitura da URL da API (ADR 0005). Nunca escrever a URL em outro lugar.
// O Expo troca `process.env.EXPO_PUBLIC_API_URL` pelo valor na hora do build, por isso
// o acesso é literal. A leitura é feita na primeira requisição e guardada.

let baseGuardada: string | undefined;

export function obterBaseUrl(): string {
  if (baseGuardada !== undefined) {
    return baseGuardada;
  }
  const lida = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (lida === '') {
    throw new Error(
      'EXPO_PUBLIC_API_URL não está definida. Copie app/.env.example para app/.env e preencha a URL da API.',
    );
  }
  baseGuardada = lida;
  return lida;
}

/** Só para testes: esquece a base lida para reler a variável de ambiente. */
export function reiniciarConfig(): void {
  baseGuardada = undefined;
}
