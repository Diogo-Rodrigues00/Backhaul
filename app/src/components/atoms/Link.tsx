import { Link as LinkDoRouter, type Href } from 'expo-router';
import { Pressable, type TextStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { Botao, type PropsBotao } from './Botao';
import { Texto } from './Texto';

// DS 5.1 (Link): sublinhado de 2 px, 3 px no hover. Sempre sublinhado: cor nunca é o único sinal.
const ESPESSURA = 2;
const ESPESSURA_HOVER = 3;

export interface PropsLink {
  href: Href;
  /** Texto do link, descritivo fora de contexto ("Criar conta", não "clique aqui"). */
  children: string;
  /** `texto` (padrão) é um link no meio do texto; `botao` é um link com cara de Botao. */
  variante?: 'texto' | 'botao';
  /** Só com `variante="botao"`: o mesmo do `Botao`. */
  aparencia?: Pick<PropsBotao, 'variante' | 'tamanho' | 'bloco' | 'icone'>;
}

function criarEstilos({ colors, radius, space, touch }: TemaVisual) {
  return {
    alvo: {
      // Alvo mínimo de 24 px (WCAG 2.2) mesmo com uma linha de texto curta.
      minHeight: touch.absoluteMin,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
    },
    texto: {
      color: colors.text.link,
      textDecorationLine: 'underline',
      textDecorationThickness: ESPESSURA,
      textUnderlineOffset: space[1],
    } as TextStyle,
    textoHover: { textDecorationThickness: ESPESSURA_HOVER } as TextStyle,
  } as const;
}

/**
 * Link do design system. Envolve o `Link` do expo-router: vira `<a href>` na web (navegação no
 * cliente, abre em nova aba com o botão do meio) e `role="link"` no iPhone.
 */
export function Link({ href, children, variante = 'texto', aparencia }: PropsLink) {
  const estilos = useEstilos(criarEstilos);

  if (variante === 'botao') {
    return (
      <LinkDoRouter href={href} asChild>
        <Botao role="link" variante="secundario" {...aparencia}>
          {children}
        </Botao>
      </LinkDoRouter>
    );
  }

  return (
    <LinkDoRouter href={href} asChild>
      <Pressable role="link" style={estilos.alvo}>
        {({ hovered }) => (
          <Texto cor="link" style={[estilos.texto, hovered && estilos.textoHover]}>
            {children}
          </Texto>
        )}
      </Pressable>
    </LinkDoRouter>
  );
}
