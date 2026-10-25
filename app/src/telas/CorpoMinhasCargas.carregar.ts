// Carregamento sob demanda do corpo de "Minhas cargas" (ADR 0011 e ADR 0004, adendo): fica fora do
// JS inicial da rota e abre já com o cliente de dados. Em arquivo próprio porque o Jest não executa
// `import()` dinâmico; os testes trocam este módulo por um que devolve o componente na hora
// (jest.setup.ts).
/* istanbul ignore file */
import { carregarComConsultas } from '@/state/consultas/carregarComConsultas';

export function carregarCorpoMinhasCargas() {
  return carregarComConsultas(() => import('./CorpoMinhasCargas'));
}
