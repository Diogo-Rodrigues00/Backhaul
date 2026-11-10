// Carregamento sob demanda do mapa (ADR 0011, item 7, e ADR 0017): só entra no navegador depois do
// clique em "Ver no mapa", fora do JS inicial de "Cargas próximas" e "Minhas cargas". Fica em arquivo
// próprio porque o Jest não executa `import()` dinâmico; os testes trocam este módulo por um que
// devolve o componente na hora (jest.setup.ts).
/* istanbul ignore file */
export function carregarMapaRota() {
  return import('./MapaRota').then((modulo) => ({ default: modulo.MapaRota }));
}
