// Abre sob demanda um corpo de tela que usa os hooks de dados (ADR 0004, adendo, ADR 0011): carrega
// o módulo das consultas (TanStack Query, um chunk só) junto com o do corpo e devolve o corpo já
// dentro do provider do cliente. É assim que o TanStack fica fora do JS inicial de toda rota.
// Em arquivo próprio e sem `import` estático de `consultas.tsx`: se estivesse, o TanStack entraria
// no chunk comum. O Jest não executa `import()`: os testes trocam os `*.carregar.ts` por módulos
// que devolvem o componente na hora (e registram o TanStack em `jest.setup.ts`).
/* istanbul ignore file */
import type { ComponentType } from 'react';

export async function carregarComConsultas<C extends ComponentType<never>>(
  carregarCorpo: () => Promise<{ default: C }>,
): Promise<{ default: C }> {
  const [consultas, corpo] = await Promise.all([import('./consultas'), carregarCorpo()]);
  return { default: consultas.comConsultas(corpo.default) };
}
