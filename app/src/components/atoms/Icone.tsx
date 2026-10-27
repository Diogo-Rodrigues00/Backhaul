// Referência de tipos (sem plataforma). Web e iPhone usam `Icone.web.tsx` e `Icone.native.tsx`; o
// Metro e o Jest sempre escolhem o arquivo da plataforma, então este não roda: fora da cobertura.
/* istanbul ignore file */
export { Desenho, Icone } from './Icone.web';
export type { PropsDesenho, PropsIcone, TamanhoIcone } from './iconeComum';
