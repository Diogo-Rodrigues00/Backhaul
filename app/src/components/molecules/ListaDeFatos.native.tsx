// iPhone: `View` por item. O rótulo e o valor são lidos juntos ("Peso: 8.000 kg") (DS 5.2).
import { View } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { space } from '@/theme/tokens';

import { LARGURA_MINIMA_ITEM, type PropsListaDeFatos } from './listaDeFatosComum';

export type { ItemDeFato, PropsListaDeFatos } from './listaDeFatosComum';

function criarEstilos(_tema: TemaVisual) {
  return {
    grade: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: space[4],
      rowGap: space[3],
    },
    item: {
      flexGrow: 1,
      flexBasis: LARGURA_MINIMA_ITEM,
      minWidth: LARGURA_MINIMA_ITEM,
      gap: space[1],
    },
  } as const;
}

/** Fatos em grade (FactList): rótulo e valor, sem cor como único sinal. */
export function ListaDeFatos({ itens }: PropsListaDeFatos) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.grade}>
      {itens.map(({ rotulo, valor }, indice) => {
        const texto = typeof valor === 'string' ? valor : null;
        return (
          <View
            key={`${indice}-${rotulo}`}
            accessible={texto !== null}
            accessibilityLabel={texto !== null ? `${rotulo}: ${texto}` : undefined}
            style={estilos.item}
          >
            <Texto nivel="sm" cor="secundario">
              {rotulo}
            </Texto>
            {texto !== null ? (
              <Texto nivel="base" peso="bold">
                {texto}
              </Texto>
            ) : (
              valor
            )}
          </View>
        );
      })}
    </View>
  );
}
