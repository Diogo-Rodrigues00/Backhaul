import { useState } from 'react';
import { Platform, Pressable, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

/** `id` do `<main>` (TemplateTela): alvo do link e da âncora `#conteudo`. */
export const ID_CONTEUDO = 'conteudo';

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    link: {
      position: 'absolute',
      top: space[2],
      left: space[4],
      zIndex: 10,
      justifyContent: 'center',
      minHeight: touch.control,
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
  } as const;
}

// Fora da tela, sem sair da árvore de foco e sem ficar menor que o alvo mínimo (WCAG 2.5.8).
const FORA_DA_TELA = { transform: [{ translateY: '-300%' }] } as unknown as ViewStyle;

/**
 * "Pular para o conteúdo": primeiro foco do cabeçalho (WCAG 2.4.1). Fica fora da tela e aparece
 * quando recebe o foco do teclado. Só na web; no iPhone o VoiceOver navega por landmarks.
 */
export function PularParaConteudo() {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const [focado, setFocado] = useState(false);

  if (Platform.OS !== 'web') return null;

  function pular(evento: GestureResponderEvent) {
    // O href mantém o link válido para ferramentas; o foco vai direto ao <main>.
    evento.preventDefault?.();
    const alvo = document.getElementById(ID_CONTEUDO);
    alvo?.focus();
    alvo?.scrollIntoView?.();
  }

  return (
    <Pressable
      role="link"
      href={`#${ID_CONTEUDO}`}
      onPress={pular}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      style={[
        estilos.link,
        { backgroundColor: colors.action.fill, borderColor: colors.action.border },
        focado ? null : FORA_DA_TELA,
      ]}
    >
      <Texto peso="bold" cor="sobreAcao">
        Pular para o conteúdo
      </Texto>
    </Pressable>
  );
}
