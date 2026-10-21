import { Link as LinkDoRouter, type Href } from 'expo-router';
import { Platform, Pressable, type TextStyle, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { brand } from '@/theme/tokens';

import { Responsivo } from './Responsivo';

/** Um destino da navegação principal. O cabeçalho e a barra inferior recebem a mesma lista. */
export interface ItemNavegacao {
  href: Href;
  rotulo: string;
  icone: NomeIcone;
}

export interface PropsAbaNavegacao extends ItemNavegacao {
  /** É a página aberta agora: `aria-current="page"`, âmbar e barra marcada (nunca só cor). */
  atual: boolean;
  /** `cabecalho`: linha com sublinhado âmbar. `barra`: coluna com ícone em cima e barra no topo. */
  variante: 'cabecalho' | 'barra';
}

// DS 5.2 (NavTab) e protótipo (.hdr nav a / .tabbar a).
const BARRA_ATUAL_CABECALHO = 4;
const BARRA_ATUAL_INFERIOR = 3;
const ALTURA_BARRA = 60;

function criarEstilos({ space, touch }: TemaVisual) {
  return {
    cabecalho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: touch.control,
      paddingHorizontal: space[4],
      borderBottomWidth: BARRA_ATUAL_CABECALHO,
      borderBottomColor: 'transparent',
    } satisfies ViewStyle,
    barra: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
      minHeight: ALTURA_BARRA,
      paddingVertical: space[2],
      paddingHorizontal: space[1],
      borderTopWidth: BARRA_ATUAL_INFERIOR,
      borderTopColor: 'transparent',
    } satisfies ViewStyle,
    rotuloBarra: { textAlign: 'center' } satisfies TextStyle,
  } as const;
}

/**
 * Aba de navegação (NavTab): ícone + rótulo sempre visível. Vira `<a href>` na web (navegação no
 * cliente) e `role="link"` no iPhone. A página atual leva `aria-current="page"`.
 */
export function AbaNavegacao({ href, rotulo, icone, atual, variante }: PropsAbaNavegacao) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const naBarra = variante === 'barra';
  const corIcone = atual && naBarra ? brand.amber : colors.text.onInverse;

  const conteudo = (
    <>
      {/* Cabeçalho: o ícone some até 1240 px (protótipo), sobra o rótulo. Barra: sempre. */}
      {naBarra ? (
        <Icone nome={icone} tamanho="destaque" cor={corIcone} />
      ) : (
        <Responsivo bp="sem-largo">
          <Icone nome={icone} cor={corIcone} />
        </Responsivo>
      )}
      <Texto
        nivel={naBarra ? 'caption' : 'base'}
        peso="bold"
        cor="sobreInverso"
        style={[naBarra && estilos.rotuloBarra, atual && naBarra && { color: brand.amber }]}
      >
        {rotulo}
      </Texto>
    </>
  );

  return (
    <LinkDoRouter href={href} asChild>
      <Pressable
        role="link"
        aria-current={atual ? 'page' : undefined}
        // `aria-selected` é inválido em link na web; no VoiceOver o "selecionado" vem do estado.
        {...(Platform.OS === 'web' ? null : { accessibilityState: { selected: atual } })}
        style={({ hovered }) => [
          naBarra ? estilos.barra : estilos.cabecalho,
          atual && {
            [naBarra ? 'borderTopColor' : 'borderBottomColor']: brand.amber,
          },
          !atual && !naBarra && hovered && { borderBottomColor: colors.text.onInverseMuted },
        ]}
      >
        {conteudo}
      </Pressable>
    </LinkDoRouter>
  );
}
