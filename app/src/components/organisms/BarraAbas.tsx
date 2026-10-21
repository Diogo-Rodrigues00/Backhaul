import { usePathname } from 'expo-router';
import { Platform, View, type ViewStyle } from 'react-native';

import { AbaNavegacao, type ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import { AreaSegura } from '@/components/molecules/AreaSegura';
import { Responsivo } from '@/components/molecules/Responsivo';
import { ehPaginaAtual, type HrefSimples } from '@/lib/navegacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { brand } from '@/theme/tokens';

export interface PropsBarraAbas {
  /** Os mesmos itens do cabeçalho completo. */
  itens: readonly ItemNavegacao[];
}

const BORDA_SUPERIOR = 3;
const ALTURA = 60;

function criarEstilos({ space }: TemaVisual) {
  return {
    barra: {
      borderTopWidth: BORDA_SUPERIOR,
      borderTopColor: brand.amber,
      zIndex: 5,
    } satisfies ViewStyle,
    lista: {
      flexDirection: 'row',
      minHeight: ALTURA,
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
 * Barra de abas (TabBar): navegação inferior de 60 px até 960 px de largura (celular e tablet).
 * Acima disso ela some e a navegação fica no `Cabecalho`. É a mesma lista de links, então há sempre
 * exatamente uma `navigation` visível.
 */
export function BarraAbas({ itens }: PropsBarraAbas) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const pathname = usePathname();

  return (
    <Responsivo bp="so-barra" style={estiloGrudado()}>
      <AreaSegura
        lado="base"
        dataSet={{ anel: 'inverso' }}
        style={[estilos.barra, { backgroundColor: colors.bg.inverse }]}
      >
        <View role="navigation" aria-label="Principal">
          <View role="list" style={estilos.lista}>
            {itens.map((item) => (
              <View key={item.rotulo} role="listitem" style={estilos.item}>
                <AbaNavegacao
                  {...item}
                  variante="barra"
                  atual={ehPaginaAtual(pathname, item.href as HrefSimples)}
                />
              </View>
            ))}
          </View>
        </View>
      </AreaSegura>
    </Responsivo>
  );
}
