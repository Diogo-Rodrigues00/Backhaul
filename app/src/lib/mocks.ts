// Modo mock (MSW) só existe na web (preview da Vercel). No iPhone/nativo: sempre pronto.
export function useMocksProntos(): boolean {
  return true;
}
