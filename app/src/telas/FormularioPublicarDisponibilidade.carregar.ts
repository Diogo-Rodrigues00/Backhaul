// Carregamento sob demanda do formulário de Publicar disponibilidade (ADR 0011): fica fora do JS
// inicial da rota, no mesmo chunk do formulário de Publicar carga (ver `formularios.ts`). Em arquivo
// próprio porque o Jest não executa `import()` dinâmico; os testes trocam este módulo por um que
// devolve o componente na hora.
/* istanbul ignore file */
import { carregarComConsultas } from '@/state/consultas/carregarComConsultas';

export function carregarFormularioPublicarDisponibilidade() {
  return carregarComConsultas(() =>
    import('./formularios').then((modulo) => ({
      default: modulo.FormularioPublicarDisponibilidade,
    })),
  );
}
