// Carregamento sob demanda do formulário de Publicar carga (ADR 0011): fica fora do JS inicial da
// rota, no mesmo chunk do formulário de Publicar disponibilidade (ver `formularios.ts`). Em arquivo
// próprio porque o Jest não executa `import()` dinâmico; os testes trocam este módulo por um que
// devolve o componente na hora.
/* istanbul ignore file */
import { carregarComConsultas } from '@/state/consultas/carregarComConsultas';

export function carregarFormularioPublicarCarga() {
  return carregarComConsultas(() =>
    import('./formularios').then((modulo) => ({ default: modulo.FormularioPublicarCarga })),
  );
}
