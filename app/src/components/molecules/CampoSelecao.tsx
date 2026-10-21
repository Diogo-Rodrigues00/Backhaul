import { Picker } from '@react-native-picker/picker';
import { useState, type Ref } from 'react';
import { Platform, View, type TextStyle, type ViewStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { fonte } from '@/theme/tipografia';

import { CampoRotulado, useEstiloEntrada, type PropsCampoBase } from './campoComum';

export interface OpcaoSelecao {
  /** Valor devolvido em `aoMudar` (igual ao do contrato da API). */
  valor: string;
  /** Texto mostrado ao usuário. */
  rotulo: string;
}

export interface PropsCampoSelecao extends PropsCampoBase {
  opcoes: readonly OpcaoSelecao[];
  /** Valor escolhido. Texto vazio = nada escolhido (mostra `textoVazio`). */
  valor: string;
  aoMudar: (valor: string) => void;
  /** Primeira linha, sem valor, enquanto nada foi escolhido ("Selecione"). */
  textoVazio?: string;
  onBlur?: () => void;
  /** Aponta para o `<select>` na web (o react-hook-form foca o campo com erro). */
  ref?: Ref<unknown>;
}

// O ícone de seta do DS (chevron) não está no conjunto de ícones; a seta é um canto de caixa girado.
const LADO_SETA = 12;

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    caixa: { position: 'relative', justifyContent: 'center' } satisfies ViewStyle,
    selectWeb: { paddingRight: space[10] + space[1] } satisfies TextStyle,
    caixaNativa: {
      minHeight: touch.control,
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    seta: {
      position: 'absolute',
      right: space[4],
      width: LADO_SETA,
      height: LADO_SETA,
      marginTop: -space[1],
      borderRightWidth: border.width,
      borderBottomWidth: border.width,
      transform: [{ rotate: '45deg' }],
    } satisfies ViewStyle,
  } as const;
}

/**
 * Select do DS (5.1): na web é um `<select>` nativo com o mesmo visual dos campos; no iPhone, o
 * seletor nativo (`@react-native-picker/picker`). Rótulo, ajuda e erro associados como no
 * `CampoTexto`. Use quando a lista é curta e fixa (ex.: certificação); para cidades, o
 * combobox de cidade.
 */
export function CampoSelecao({
  rotulo,
  opcional,
  ajuda,
  erro,
  id,
  desabilitado = false,
  opcoes,
  valor,
  aoMudar,
  textoVazio,
  onBlur,
  ref,
}: PropsCampoSelecao) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const [focado, setFocado] = useState(false);
  const web = Platform.OS === 'web';
  const estiloEntrada = useEstiloEntrada(Boolean(erro), focado, desabilitado);
  const borda = desabilitado
    ? colors.border.subtle
    : erro
      ? colors.error.border
      : colors.border.control;

  return (
    <CampoRotulado rotulo={rotulo} opcional={opcional} ajuda={ajuda} erro={erro} id={id}>
      {(a11y) => {
        // O <select> da web não conhece accessibilityLabel/Hint (o React reclamaria do atributo): lá
        // valem os aria-*. No iPhone o seletor nativo só lê accessibilityLabel/Hint.
        const { accessibilityLabel, accessibilityHint, ...ariaWeb } = a11y;
        const propsA11y = web ? ariaWeb : { accessibilityLabel, accessibilityHint };
        const seletor = (
          <Picker
            ref={ref as never}
            {...propsA11y}
            enabled={!desabilitado}
            selectedValue={valor}
            onValueChange={(novo) => aoMudar(String(novo))}
            onFocus={() => setFocado(true)}
            onBlur={() => {
              setFocado(false);
              onBlur?.();
            }}
            // iPhone: o texto das linhas do seletor segue a escala do DS e o Dynamic Type.
            itemStyle={{
              ...fonte('base', 'regular'),
              color: desabilitado ? colors.disabled.text : colors.text.primary,
            }}
            style={
              web
                ? [estiloEntrada, estilos.selectWeb, { appearance: 'none' } as TextStyle]
                : { color: colors.text.primary }
            }
          >
            {textoVazio !== undefined ? <Picker.Item label={textoVazio} value="" /> : null}
            {opcoes.map((opcao) => (
              <Picker.Item key={opcao.valor} label={opcao.rotulo} value={opcao.valor} />
            ))}
          </Picker>
        );

        if (!web) {
          return (
            // O seletor do iPhone ignora `enabled`: desligado, a caixa não recebe toques.
            <View
              pointerEvents={desabilitado ? 'none' : 'auto'}
              accessibilityState={{ disabled: desabilitado }}
              style={[
                estilos.caixaNativa,
                {
                  borderColor: borda,
                  backgroundColor: desabilitado ? colors.disabled.bg : colors.bg.surface,
                },
              ]}
            >
              {seletor}
            </View>
          );
        }
        return (
          <View style={estilos.caixa}>
            {seletor}
            <View
              aria-hidden
              pointerEvents="none"
              style={[
                estilos.seta,
                { borderColor: desabilitado ? colors.disabled.text : colors.text.secondary },
              ]}
            />
          </View>
        );
      }}
    </CampoRotulado>
  );
}
