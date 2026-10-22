// SeletorLocal no iPhone: o mesmo campo de busca e, abaixo, até 8 resultados como botões. O VoiceOver
// não tem combobox (ADR 0009); a contagem de resultados é anunciada por `anunciar`, 300 ms depois da
// última tecla.
import { useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { CampoRotulado, EntradaTexto, useIdCampo } from '@/components/molecules/campoComum';
import { anunciar } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { CascaSeletorLocal } from './SeletorLocalCasca';
import { rotuloDaCidade, useSeletorLocal, type PropsSeletorLocal } from './SeletorLocal.logica';

export type { Local, PropsSeletorLocal } from './SeletorLocal.logica';

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    resultados: { gap: space[2] } satisfies ViewStyle,
    opcao: {
      minHeight: touch.control,
      justifyContent: 'center',
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
  } as const;
}

export function SeletorLocal({
  rotulo,
  valor,
  aoMudar,
  permitirGps = false,
  erro,
  id: idDado,
}: PropsSeletorLocal) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const id = useIdCampo(idDado);
  const seletor = useSeletorLocal({ valor, aoMudar, permitirGps });
  const { termo, resultados, contagem } = seletor;

  // Sem `aria-live` no iOS: a contagem (já atrasada em 300 ms) vai pelo AccessibilityInfo.
  useEffect(() => {
    if (contagem !== '') anunciar(contagem);
  }, [contagem]);

  return (
    <CascaSeletorLocal
      id={id}
      rotulo={rotulo}
      valor={valor}
      permitirGps={permitirGps}
      erro={erro}
      gps={seletor.gps}
      aoUsarGps={seletor.usarGps}
      aoTrocar={seletor.trocar}
      refTrocar={seletor.refTrocar}
    >
      <CampoRotulado
        rotulo={permitirGps ? 'Ou escolha a cidade' : rotulo}
        ajuda="Digite o nome da cidade e escolha na lista."
        erro={erro}
        id={id}
      >
        {(a11y) => (
          <View style={estilos.resultados}>
            <EntradaTexto
              a11y={a11y}
              ref={seletor.refBusca}
              value={termo}
              onChangeText={seletor.setTermo}
              autoComplete="off"
              autoCorrect={false}
              returnKeyType="search"
            />
            {contagem !== '' ? (
              <Texto nivel="sm" cor="secundario">
                {contagem}
              </Texto>
            ) : null}
            {resultados.map((cidade) => {
              const nome = rotuloDaCidade(cidade);
              return (
                <Pressable
                  key={cidade.id}
                  role="button"
                  aria-label={`Escolher ${nome}`}
                  onPress={() => seletor.escolher(cidade)}
                  style={({ pressed }) => [
                    estilos.opcao,
                    {
                      backgroundColor: pressed ? colors.bg.highlight : colors.bg.surface,
                      borderColor: pressed ? colors.text.primary : colors.border.control,
                    },
                  ]}
                >
                  <Texto peso="bold">{nome}</Texto>
                </Pressable>
              );
            })}
          </View>
        )}
      </CampoRotulado>
    </CascaSeletorLocal>
  );
}
