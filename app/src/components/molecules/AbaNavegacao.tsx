import { Link as LinkDoRouter, type Href } from 'expo-router';
import { useState } from 'react';
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
  /**
   * Só na barra inferior (até 960 px): o item vai para o "Mais" em vez de ficar à vista. No cabeçalho
   * ele aparece normalmente, na ordem da lista.
   */
  noMais?: boolean;
}

export interface PropsAbaNavegacao extends ItemNavegacao {
  /** É a página aberta agora: `aria-current="page"`, âmbar e barra marcada (nunca só cor). */
  atual: boolean;
  /**
   * `cabecalho`: linha com sublinhado âmbar. `barra`: coluna com ícone em cima e barra no topo.
   * `menu`: linha dentro do "Mais" da barra (ícone e rótulo lado a lado).
   */
  variante: 'cabecalho' | 'barra' | 'menu';
}

// DS 5.2 (NavTab) e protótipo (.hdr nav a / .tabbar a).
const BARRA_ATUAL_CABECALHO = 4;
const BARRA_ATUAL_INFERIOR = 3;
const ALTURA_BARRA = 60;

function criarEstilos({ radius, space, touch }: TemaVisual) {
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
    menu: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: touch.control,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
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
  const noMenu = variante === 'menu';
  // Hover por estado (e não por `style` como função): o `asChild` do Link mescla `style` e só aceita objeto.
  const [sobre, setSobre] = useState(false);
  // Barra e menu marcam a página atual em âmbar; o cabeçalho usa só o sublinhado.
  const destacada = atual && (naBarra || noMenu);
  const corIcone = destacada ? brand.amber : colors.text.onInverse;

  const estiloBase = naBarra ? estilos.barra : noMenu ? estilos.menu : estilos.cabecalho;
  const estiloDaAba: ViewStyle = {
    ...estiloBase,
    ...(atual && naBarra ? { borderTopColor: brand.amber } : null),
    ...(atual && !naBarra && !noMenu ? { borderBottomColor: brand.amber } : null),
    ...(!atual && !naBarra && !noMenu && sobre
      ? { borderBottomColor: colors.text.onInverseMuted }
      : null),
  };

  const conteudo = (
    <>
      {/* Cabeçalho: o ícone some até 1240 px (protótipo), sobra o rótulo. Barra e menu: sempre. */}
      {naBarra ? (
        <Icone nome={icone} tamanho="destaque" cor={corIcone} />
      ) : noMenu ? (
        <Icone nome={icone} cor={corIcone} />
      ) : (
        <Responsivo bp="sem-largo">
          <Icone nome={icone} cor={corIcone} />
        </Responsivo>
      )}
      <Texto
        nivel={naBarra ? 'caption' : 'base'}
        peso="bold"
        cor="sobreInverso"
        style={[naBarra && estilos.rotuloBarra, destacada && { color: brand.amber }]}
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
        onHoverIn={() => setSobre(true)}
        onHoverOut={() => setSobre(false)}
        // Achatado: o `asChild` do Link só aceita objeto (um array de estilos gera aviso).
        style={estiloDaAba}
      >
        {conteudo}
      </Pressable>
    </LinkDoRouter>
  );
}
