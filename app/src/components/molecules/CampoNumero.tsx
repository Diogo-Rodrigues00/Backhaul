import type { Ref } from 'react';
import { Platform, View, type TextInput, type TextStyle, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { CampoRotulado, EntradaTexto, type PropsCampoBase } from './campoComum';
import type { PropsCampoTexto } from './CampoTexto';

export interface PropsCampoNumero
  extends
    PropsCampoBase,
    Omit<
      PropsCampoTexto,
      keyof PropsCampoBase | 'inputMode' | 'keyboardType' | 'secureTextEntry' | 'ref'
    > {
  /** Unidade antes do valor ("R$"). Decorativa: a unidade vai também no rótulo ou na ajuda. */
  prefixo?: string;
  /** Unidade depois do valor ("kg", "km"). Decorativa, como o prefixo. */
  sufixo?: string;
  /** `decimal` (padrão) abre o teclado com vírgula; `inteiro` abre só os dígitos. */
  modo?: 'inteiro' | 'decimal';
  ref?: Ref<TextInput>;
}

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    linha: { flexDirection: 'row', alignItems: 'stretch' } satisfies ViewStyle,
    entrada: { flex: 1, minWidth: 0 } satisfies TextStyle,
    afixo: {
      minHeight: touch.control,
      justifyContent: 'center',
      paddingHorizontal: space[3],
      borderWidth: border.width,
    } satisfies ViewStyle,
    prefixo: {
      borderRightWidth: 0,
      borderTopLeftRadius: radius.md,
      borderBottomLeftRadius: radius.md,
    } satisfies ViewStyle,
    sufixo: {
      borderLeftWidth: 0,
      borderTopRightRadius: radius.md,
      borderBottomRightRadius: radius.md,
    } satisfies ViewStyle,
    comPrefixo: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } satisfies TextStyle,
    comSufixo: { borderTopRightRadius: 0, borderBottomRightRadius: 0 } satisfies TextStyle,
  } as const;
}

/**
 * Campo numérico com unidade (AffixField, DS 5.2): "R$" antes ou "kg"/"km" depois. O prefixo e o
 * sufixo são decorativos (`aria-hidden`); a unidade precisa estar no rótulo ("Peso (kg)").
 * `inputMode` `decimal`/`numeric` abre o teclado certo no iPhone e no celular.
 *
 * O campo guarda o TEXTO digitado (ADR 0007) e a conversão é feita só no envio, com `paraNumero`.
 * Cuidado com "1.234": em pt-BR é mil duzentos e trinta e quatro, mas `paraNumero` lê 1,234. Por
 * isso os campos de valor e de peso devem validar com `numeroSemAmbiguidade` (que recusa o caso)
 * além de `numeroPositivo`/`numeroAte`.
 */
export function CampoNumero({
  rotulo,
  opcional,
  ajuda,
  erro,
  id,
  desabilitado,
  prefixo,
  sufixo,
  modo = 'decimal',
  ref,
  ...resto
}: PropsCampoNumero) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const invalido = Boolean(erro);

  const borda = desabilitado
    ? colors.border.subtle
    : invalido
      ? colors.error.border
      : colors.border.control;
  const afixoEstilo = [
    estilos.afixo,
    { borderColor: borda, backgroundColor: desabilitado ? colors.disabled.bg : colors.bg.sunken },
  ];
  const escondido = {
    'aria-hidden': true,
    importantForAccessibility: 'no-hide-descendants',
    accessibilityElementsHidden: true,
  } as const;
  const cor = desabilitado ? 'desabilitado' : 'secundario';

  return (
    <CampoRotulado rotulo={rotulo} opcional={opcional} ajuda={ajuda} erro={erro} id={id}>
      {(a11y) => (
        <View style={estilos.linha}>
          {prefixo ? (
            <View {...escondido} style={[...afixoEstilo, estilos.prefixo]}>
              <Texto peso="bold" cor={cor}>
                {prefixo}
              </Texto>
            </View>
          ) : null}
          <EntradaTexto
            {...resto}
            a11y={a11y}
            desabilitado={desabilitado}
            ref={ref}
            inputMode={modo === 'inteiro' ? 'numeric' : 'decimal'}
            autoCorrect={false}
            estiloExtra={[
              estilos.entrada,
              prefixo ? estilos.comPrefixo : null,
              sufixo ? estilos.comSufixo : null,
              Platform.OS === 'web' ? ({ fontVariantNumeric: 'tabular-nums' } as TextStyle) : null,
            ]}
          />
          {sufixo ? (
            <View {...escondido} style={[...afixoEstilo, estilos.sufixo]}>
              <Texto peso="bold" cor={cor}>
                {sufixo}
              </Texto>
            </View>
          ) : null}
        </View>
      )}
    </CampoRotulado>
  );
}
