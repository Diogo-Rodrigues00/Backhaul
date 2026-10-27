// Carregamento sob demanda do diálogo de proposta (ADR 0011): só entra no navegador quando o
// motorista pede a primeira proposta, fora do JS inicial de "Cargas próximas". Fica em arquivo
// próprio porque o Jest não executa `import()` dinâmico; os testes trocam este módulo por um que
// devolve o componente na hora (jest.setup.ts).
/* istanbul ignore file */
export function carregarFormularioProposta() {
  return import('./FormularioProposta').then((modulo) => ({ default: modulo.FormularioProposta }));
}
