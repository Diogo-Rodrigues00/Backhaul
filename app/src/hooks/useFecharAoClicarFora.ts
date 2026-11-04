import { useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

/**
 * Enquanto `ativo`, um toque ou clique fora do elemento de `ref` chama `fechar` (web). O listener é em
 * `pointerdown` no `document` e sai ao desligar ou desmontar. No iPhone não há listener: quem fecha ao
 * tocar fora é o fundo transparente do próprio componente (ver `MaisDaBarra`).
 */
export function useFecharAoClicarFora(
  ref: RefObject<unknown>,
  ativo: boolean,
  fechar: () => void,
): void {
  // A função mais nova fica num ref: o listener não é recriado a cada render da tela.
  const fecharAtual = useRef(fechar);
  useEffect(() => {
    fecharAtual.current = fechar;
  });

  useEffect(() => {
    if (!ativo || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const aoPointerDown = (evento: Event) => {
      const no = ref.current as Node | null;
      if (no && evento.target instanceof Node && no.contains(evento.target)) return;
      fecharAtual.current();
    };
    document.addEventListener('pointerdown', aoPointerDown);
    return () => document.removeEventListener('pointerdown', aoPointerDown);
  }, [ativo, ref]);
}
