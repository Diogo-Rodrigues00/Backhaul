import { useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

/** Por que o painel fechou: o foco só volta ao gatilho quando foi o Esc (ou o gesto de voltar do VoiceOver). */
export type MotivoFechamento = 'clique-fora' | 'escape' | 'foco-saiu';

/**
 * Enquanto `ativo`, na web: um clique ou toque fora do elemento de `ref` chama `fechar('clique-fora')`;
 * Esc (no `document`, com o foco em qualquer lugar) chama `fechar('escape')`; e quando o foco sai do
 * elemento para fora dele (Tab, Shift+Tab) chama `fechar('foco-saiu')`, sem roubar o foco de volta.
 * Os listeners saem ao desligar ou desmontar. No iPhone não há listener: quem fecha é o fundo
 * transparente e o gesto de voltar do VoiceOver, no próprio `MaisDaBarra`.
 */
export function useFecharAoClicarFora(
  ref: RefObject<unknown>,
  ativo: boolean,
  fechar: (motivo: MotivoFechamento) => void,
): void {
  // A função mais nova fica num ref: os listeners não são recriados a cada render da tela.
  const fecharAtual = useRef(fechar);
  useEffect(() => {
    fecharAtual.current = fechar;
  });

  useEffect(() => {
    if (!ativo || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const raiz = () => ref.current as Node | null;
    // Verdadeiro entre um pointerdown e o pointerup dentro da raiz. Um Safari que não põe foco no botão
    // não deve fechar o painel quando o foco "some" por causa de um clique lá dentro.
    let ponteiroDentro = false;

    const aoPointerDown = (evento: Event) => {
      const no = raiz();
      ponteiroDentro = Boolean(no && evento.target instanceof Node && no.contains(evento.target));
      if (!ponteiroDentro) fecharAtual.current('clique-fora');
    };
    const aoPointerUp = () => {
      ponteiroDentro = false;
    };
    const aoEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fecharAtual.current('escape');
    };
    const aoFocoSair = (evento: FocusEvent) => {
      const destino = evento.relatedTarget;
      if (destino instanceof Node) {
        if (raiz()?.contains(destino)) return;
      } else if (ponteiroDentro) {
        return;
      }
      fecharAtual.current('foco-saiu');
    };

    document.addEventListener('pointerdown', aoPointerDown);
    document.addEventListener('pointerup', aoPointerUp);
    document.addEventListener('keydown', aoEscape);
    const elemento = raiz();
    elemento?.addEventListener('focusout', aoFocoSair as EventListener);
    return () => {
      document.removeEventListener('pointerdown', aoPointerDown);
      document.removeEventListener('pointerup', aoPointerUp);
      document.removeEventListener('keydown', aoEscape);
      elemento?.removeEventListener('focusout', aoFocoSair as EventListener);
    };
  }, [ativo, ref]);
}
