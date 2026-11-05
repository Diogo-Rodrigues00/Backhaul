// "Mais" da barra inferior (protótipo da Fase 6, card 026): um botão que abre a lista dos destinos que
// não cabem na barra do celular. Fechado, os links nem existem na página, então o Tab não os alcança.
import { useRef, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { useFecharAoClicarFora } from '@/hooks/useFecharAoClicarFora';
import { moverFoco } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { brand } from '@/theme/tokens';

import { AbaNavegacao, type ItemNavegacao } from './AbaNavegacao';

/** Um destino dentro do "Mais", com a marca de página atual calculada pela barra. */
export interface DestinoDoMais extends ItemNavegacao {
  atual: boolean;
}

export interface PropsMaisDaBarra {
  destinos: readonly DestinoDoMais[];
}

// Medidas do protótipo (.tabbar__btn e .more): botão com a altura da barra, borda de 3 px no topo e
// no painel. Painel com 236 px de largura mínima, como no protótipo.
const ALTURA_GATILHO = 60;
const BORDA = 3;
const LARGURA_PAINEL = 236;

function criarEstilos({ radius, space }: TemaVisual) {
  return {
    raiz: { flex: 1, position: 'relative' } satisfies ViewStyle,
    // Tamanho e posição são definidos no componente (dependem da janela). Só o transparente e o absoluto.
    fundo: { position: 'absolute', backgroundColor: 'transparent' } satisfies ViewStyle,
    gatilho: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
      minHeight: ALTURA_GATILHO,
      paddingVertical: space[2],
      paddingHorizontal: space[1],
      borderTopWidth: BORDA,
      borderTopColor: 'transparent',
    } satisfies ViewStyle,
    gatilhoMarcado: { borderTopColor: brand.amber } satisfies ViewStyle,
    painel: {
      position: 'absolute',
      bottom: '100%',
      right: 0,
      zIndex: 6,
      minWidth: LARGURA_PAINEL,
      padding: space[2],
      gap: space[1],
      borderWidth: BORDA,
      borderBottomWidth: 0,
      borderColor: brand.amber,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    } satisfies ViewStyle,
  } as const;
}

// Id fixo do painel (só existe um "Mais" na página). Com `useId`, o id que o botão põe em `aria-controls`
// e o que o painel recebe saíram diferentes depois da exportação estática: o axe acusou o id inexistente.
const ID_PAINEL = 'mais-da-barra-painel';

type EventoTecla = { key?: string; nativeEvent?: { key?: string }; preventDefault?: () => void };

/**
 * Botão "Mais" com `aria-expanded` e `aria-controls` apontando para o painel. O painel é uma lista de
 * links (`AbaNavegacao` na variante `menu`). Esc, na web, fecha o painel e devolve o foco ao botão. Se
 * a página aberta estiver dentro do "Mais", o botão fica marcado em âmbar (e o link tem `aria-current`).
 */
export function MaisDaBarra({ destinos }: PropsMaisDaBarra) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const [aberto, setAberto] = useState(false);
  const refRaiz = useRef<View>(null);
  const refGatilho = useRef<View>(null);
  const janela = useWindowDimensions();
  const web = Platform.OS === 'web';
  const marcado = aberto || destinos.some((destino) => destino.atual);
  const corDoGatilho = marcado ? brand.amber : colors.text.onInverse;

  // Clique ou toque fora fecha o painel. Na web é um listener no `document`; no iPhone, o fundo abaixo.
  useFecharAoClicarFora(refRaiz, aberto, () => setAberto(false));

  // Só na web: no iPhone não há tecla Esc. O evento sobe do botão e dos links, porque o `onKeyDown`
  // fica no contêiner que tem os dois.
  const teclado = web
    ? {
        onKeyDown: (evento: EventoTecla) => {
          const tecla = evento.key ?? evento.nativeEvent?.key;
          if (!aberto || tecla !== 'Escape') return;
          evento.preventDefault?.();
          setAberto(false);
          moverFoco(refGatilho);
        },
      }
    : {};
  // `aria-controls` não está nos tipos do React Native (que não precisa dele): vai só na web.
  const ligacaoComPainel = web ? { 'aria-controls': ID_PAINEL } : {};

  return (
    <View ref={refRaiz} style={estilos.raiz} {...teclado}>
      {/* iPhone: fundo transparente, cobre a janela inteira por trás do botão e do painel. Tocar nele
          fecha o painel. Fica antes do botão na ordem de pintura, então o botão continua tocável. */}
      {aberto && !web ? (
        <Pressable
          testID="mais-fundo"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => setAberto(false)}
          style={[
            estilos.fundo,
            {
              left: -janela.width * 2,
              top: -janela.height * 2,
              width: janela.width * 4,
              height: janela.height * 4,
            },
          ]}
        />
      ) : null}
      <Pressable
        ref={refGatilho}
        role="button"
        aria-expanded={aberto}
        {...ligacaoComPainel}
        {...(web ? null : { accessibilityState: { expanded: aberto } })}
        onPress={() => setAberto((valor) => !valor)}
        style={[estilos.gatilho, marcado && estilos.gatilhoMarcado]}
      >
        <Icone nome="plus" tamanho="destaque" cor={corDoGatilho} />
        <Texto
          nivel="caption"
          peso="bold"
          cor="sobreInverso"
          style={marcado && { color: brand.amber }}
        >
          Mais
        </Texto>
      </Pressable>
      {aberto ? (
        <View
          nativeID={ID_PAINEL}
          role="list"
          style={[estilos.painel, { backgroundColor: colors.bg.inverse }]}
        >
          {destinos.map((destino) => (
            <View key={destino.rotulo} role="listitem">
              <AbaNavegacao {...destino} variante="menu" />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
