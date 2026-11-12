import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { AbaNavegacao, type ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import { AreaSegura } from '@/components/molecules/AreaSegura';
import { MaisDaBarra } from '@/components/molecules/MaisDaBarra';
import { Responsivo } from '@/components/molecules/Responsivo';
import { indiceDaPaginaAtual, type HrefSimples } from '@/lib/navegacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { barraInferior, brand, VARIAVEL_ALTURA_BARRA } from '@/theme/tokens';

export interface PropsBarraAbas {
  /** Os mesmos itens do cabeçalho completo. */
  itens: readonly ItemNavegacao[];
}

function criarEstilos({ space }: TemaVisual) {
  return {
    barra: {
      borderTopWidth: barraInferior.borda,
      borderTopColor: brand.amber,
      zIndex: 5,
    } satisfies ViewStyle,
    lista: {
      flexDirection: 'row',
      minHeight: barraInferior.altura,
      paddingHorizontal: space[1],
    } satisfies ViewStyle,
    item: { flex: 1 } satisfies ViewStyle,
  } as const;
}

// Grudada na base da janela enquanto a página rola. No iPhone ela fica fora do ScrollView.
// O tipo de `position` do React Native não prevê `sticky`; o react-native-web aceita.
function estiloGrudado(): ViewStyle {
  return (Platform.OS === 'web' ? { position: 'sticky', bottom: 0 } : {}) as unknown as ViewStyle;
}

/**
 * Web: publica a altura real da barra (cresce com rótulo quebrado em 320 px ou texto ampliado) em
 * `--altura-barra` no `<html>`, de onde o `scroll-padding-bottom` global a lê. Sem barra, a variável sai.
 */
function publicarAltura(evento: LayoutChangeEvent) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.style.setProperty(
    VARIAVEL_ALTURA_BARRA,
    `${evento.nativeEvent.layout.height}px`,
  );
}

function limparAltura() {
  if (Platform.OS === 'web' && typeof document !== 'undefined')
    document.documentElement.style.removeProperty(VARIAVEL_ALTURA_BARRA);
}

/**
 * Barra de abas (TabBar): navegação inferior de 60 px até 960 px de largura (celular e tablet).
 * Acima disso ela some e a navegação fica no `Cabecalho`. É a mesma lista de links, então há sempre
 * exatamente uma `navigation` visível.
 */
export function BarraAbas({ itens }: PropsBarraAbas) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  useEffect(() => limparAltura, []);
  const pathname = usePathname();
  const indiceAtual = indiceDaPaginaAtual(
    pathname,
    itens.map((item) => item.href as HrefSimples),
  );
  // Os itens marcados `noMais` vão para o "Mais" (mantendo a ordem); os demais ficam à vista.
  const aVista = itens.flatMap((item, indice) =>
    item.noMais ? [] : [{ ...item, atual: indice === indiceAtual }],
  );
  const noMais = itens.flatMap((item, indice) =>
    item.noMais ? [{ ...item, atual: indice === indiceAtual }] : [],
  );

  return (
    <Responsivo bp="so-barra" style={estiloGrudado()}>
      <AreaSegura
        lado="base"
        dataSet={{ anel: 'inverso' }}
        onLayout={publicarAltura}
        style={[estilos.barra, { backgroundColor: colors.bg.inverse }]}
      >
        <View role="navigation" aria-label="Principal">
          <View role="list" style={estilos.lista}>
            {aVista.map((item) => (
              <View key={item.rotulo} role="listitem" style={estilos.item}>
                <AbaNavegacao {...item} variante="barra" />
              </View>
            ))}
            {noMais.length > 0 ? (
              <View role="listitem" style={estilos.item}>
                <MaisDaBarra destinos={noMais} />
              </View>
            ) : null}
          </View>
        </View>
      </AreaSegura>
    </Responsivo>
  );
}
