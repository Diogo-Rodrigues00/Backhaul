// Carregamento sob demanda da prévia da carga (ADR 0011): o cartão fica fora do JS inicial da rota
// Publicar carga. Fica em arquivo próprio porque o Jest não executa `import()` dinâmico; os testes
// trocam este módulo por um que devolve o componente na hora.
/* istanbul ignore file */
export function carregarPreviaCarga() {
  return import('./PreviaCarga');
}
