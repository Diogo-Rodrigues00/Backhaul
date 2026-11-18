// Referência de tipos (sem plataforma). O Metro escolhe `MapaRota.web.tsx` (ladrilhos <img> + <svg>)
// ou `MapaRota.native.tsx` (Image + react-native-svg); este arquivo só dá a assinatura ao TypeScript.
/* istanbul ignore file */
export { MapaRota } from './MapaRota.native';
export type { PropsMapaRota } from './MapaRota.logica';
