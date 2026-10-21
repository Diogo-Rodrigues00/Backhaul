// Web: não há barra de status. O iPhone usa BarraDeStatus.native.tsx (o Metro escolhe pela plataforma);
// separar evita levar o expo-status-bar para o JS inicial da web.
export function BarraDeStatus() {
  return null;
}
