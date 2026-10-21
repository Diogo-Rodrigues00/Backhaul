// Referência de tipos (sem plataforma). Web e iPhone usam `CorpoDaTela.web.tsx` e
// `CorpoDaTela.native.tsx`; o Metro e o Jest sempre escolhem o arquivo da plataforma.
/* istanbul ignore file */
export { CorpoDaTela } from './CorpoDaTela.web';
export type { PropsCorpoDaTela } from './corpoDaTelaComum';
