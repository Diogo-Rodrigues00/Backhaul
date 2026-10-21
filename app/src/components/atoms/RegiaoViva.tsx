import { useEffect, useState } from 'react';
import { Platform, Text, View, type ViewProps } from 'react-native';

// Direto do emissor: é o mesmo que `anunciar` (web e iPhone) usa, e o `_layout` não precisa levar o
// resto de `a11y` no JS inicial (ADR 0011).
import { ouvirAnuncios } from '@/lib/anuncios';

import { estiloOculto } from './oculto';

// Some da região depois de um tempo, para o leitor de tela não achar texto velho ao navegar.
const LIMPAR_EM_MS = 8000;
// Anunciar de novo a mesma frase: um espaço sem quebra no fim muda o texto sem mudar o que se ouve.
const ESPACO_SEM_QUEBRA = ' ';

// Só no iPhone: na web, esconder a região da árvore de acessibilidade a deixaria muda.
const ESCONDIDA_DO_VOICEOVER: ViewProps = {
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
};

/**
 * Região viva global (ADR 0009): `role="status"` + `aria-live="polite"`, visualmente oculta.
 * Assina `anunciar()` de `src/lib/a11y` e mostra a mensagem sem mover o foco. Monte UMA vez, no
 * `_layout` raiz. No iPhone o anúncio sai por `AccessibilityInfo` (feito por `anunciar`); aqui a
 * região fica escondida do VoiceOver para a frase não ser lida duas vezes.
 */
export function RegiaoViva() {
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    let limpar: ReturnType<typeof setTimeout> | undefined;
    const parar = ouvirAnuncios((texto) => {
      setMensagem((atual) => (atual === texto ? texto + ESPACO_SEM_QUEBRA : texto));
      clearTimeout(limpar);
      limpar = setTimeout(() => setMensagem(''), LIMPAR_EM_MS);
    });
    return () => {
      parar();
      clearTimeout(limpar);
    };
  }, []);

  return (
    <View
      role="status"
      aria-live="polite"
      aria-atomic
      {...(Platform.OS === 'web' ? null : ESCONDIDA_DO_VOICEOVER)}
      style={estiloOculto}
    >
      <Text>{mensagem}</Text>
    </View>
  );
}
