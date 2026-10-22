// Carregamento sob demanda do corpo de "Propostas da carga" (ADR 0011): fica fora do JS inicial da
// rota. Em arquivo próprio porque o Jest não executa `import()` dinâmico; os testes trocam este
// módulo por um que devolve o componente na hora.
/* istanbul ignore file */
export function carregarCorpoPropostasDaCarga() {
  return import('./CorpoPropostasDaCarga');
}
