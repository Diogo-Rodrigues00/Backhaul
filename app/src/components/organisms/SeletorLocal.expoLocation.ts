// Carregamento sob demanda do `expo-location` (ADR 0011): o módulo só é baixado quando a pessoa toca
// em "Usar minha localização" e fica fora do JS inicial e do chunk da rota. Fica em arquivo próprio
// porque o Jest não executa `import()` dinâmico; os testes trocam este módulo por um falso.
/* istanbul ignore file */
export type ExpoLocation = typeof import('expo-location');

export function carregarExpoLocation(): Promise<ExpoLocation> {
  return import('expo-location');
}
