// Web: o foco está no `body`, isto é, o elemento que o tinha saiu da tela (ou nunca houve foco).
// Serve para devolver o foco só quando ele se perdeu (WCAG 2.4.3), nunca para tirá-lo de onde a pessoa
// o pôs. No iPhone não há DOM nem `body`: devolve `false` e o foco do VoiceOver segue como está.
export function focoNoCorpo(): boolean {
  if (typeof document === 'undefined') return false;
  const ativo = document.activeElement;
  return ativo === null || ativo === document.body;
}
