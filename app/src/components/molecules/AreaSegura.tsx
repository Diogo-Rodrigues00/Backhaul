// Referência de tipos (sem plataforma). Web e iPhone usam `AreaSegura.web.tsx` e
// `AreaSegura.native.tsx`; o Metro e o Jest sempre escolhem o arquivo da plataforma.
/* istanbul ignore file */
export { AreaSegura } from './AreaSegura.web';
export type { PropsAreaSegura } from './areaSeguraComum';
