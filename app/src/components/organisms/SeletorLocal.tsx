// Referência de tipos (sem plataforma). O Metro escolhe `SeletorLocal.web.tsx` (combobox ARIA) ou
// `SeletorLocal.native.tsx` (resultados como botões); este arquivo só dá a assinatura ao TypeScript.
/* istanbul ignore file */
export { SeletorLocal } from './SeletorLocal.native';
export type { Local, PropsSeletorLocal } from './SeletorLocal.logica';
