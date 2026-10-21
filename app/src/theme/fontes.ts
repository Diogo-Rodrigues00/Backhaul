// Contrato comum de fontes.web.ts e fontes.native.ts (o Metro escolhe pela plataforma;
// este arquivo só dá o tipo ao TypeScript e serve de reserva).
/** `true` quando a fonte do app está pronta para pintar. */
export function useFontesCarregadas(): boolean {
  return true;
}
