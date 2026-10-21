// Referência de tipos (sem plataforma). O Metro escolhe `ListaDeFatos.web.tsx` (<dl>) ou
// `ListaDeFatos.native.tsx` (View); este arquivo só dá a assinatura ao TypeScript.
/* istanbul ignore file */
export { ListaDeFatos } from './ListaDeFatos.native';
export type { ItemDeFato, PropsListaDeFatos } from './listaDeFatosComum';
