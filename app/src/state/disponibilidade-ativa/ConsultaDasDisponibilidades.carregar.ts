// Carregamento sob demanda da consulta de disponibilidades do motorista (ADR 0004, adendo): fica
// fora do JS inicial e abre já com o cliente de dados. Em arquivo próprio porque o Jest não executa
// `import()` dinâmico; os testes trocam este módulo por um que devolve o componente na hora
// (jest.setup.ts).
/* istanbul ignore file */
import { carregarComConsultas } from '@/state/consultas/carregarComConsultas';

export function carregarConsultaDasDisponibilidades() {
  return carregarComConsultas(() => import('./ConsultaDasDisponibilidades'));
}
