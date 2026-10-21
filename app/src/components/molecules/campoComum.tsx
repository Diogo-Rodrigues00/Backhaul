// Peças que os campos de formulário compartilham (DS 5.1 TextInput e 5.2 FormField): rótulo visível,
// ajuda, erro com ícone, e o estilo da caixa de entrada. Os campos (CampoTexto, CampoSenha,
// CampoNumero, CampoSelecao) e o GrupoOpcoes montam suas telas com isto; telas não usam direto.
import { useId, useState, type ReactNode, type Ref } from 'react';
import {
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { propsDeCampo, type PropsCampo } from '@/lib/a11yCampo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import { fonte, maxFontSizeMultiplier } from '@/theme/tipografia';

/** Props que todo campo de formulário tem: rótulo, ajuda e erro (ADR 0007: `erro?: string`). */
export interface PropsCampoBase {
  /** Rótulo visível acima do campo. Placeholder nunca é rótulo (DS 5.1). */
  rotulo: string;
  /** Marca "(opcional)" no rótulo. Campo obrigatório não leva marca (DS 5.2). */
  opcional?: boolean;
  /** Frase de ajuda sob o rótulo ("Mínimo de 8 caracteres."). Associada ao campo. */
  ajuda?: string;
  /** Mensagem de erro (do validador ou da API). Com ela o campo fica inválido. */
  erro?: string;
  /** `id` do campo (base dos ids de rótulo, ajuda e erro). Padrão: gerado. */
  id?: string;
  /** Campo desligado: sai da ordem de foco e ignora toques. */
  desabilitado?: boolean;
}

/** Id estável e seguro para `nativeID`/`aria-*` (sem os dois-pontos do `useId`). */
export function useIdCampo(id?: string): string {
  const gerado = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return id ?? `campo-${gerado}`;
}

const ESPESSURA_ANEL = 3;
const DESLOCAMENTO_ANEL = 2;

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  // Com erro a borda passa de 2 para 3 px: o preenchimento cede o que a borda ganhou, e o campo
  // não muda de tamanho nem empurra o texto (DS 5.1).
  const diferenca = border.widthInvalid - border.width;
  return {
    campo: { gap: space[2], minWidth: 0, flexShrink: 1 } satisfies ViewStyle,
    rotuloEAjuda: { gap: space[1] } satisfies ViewStyle,
    linhaErro: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[2],
    } satisfies ViewStyle,
    textoErro: { flexShrink: 1 } satisfies TextStyle,
    entrada: {
      minHeight: touch.control,
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies TextStyle,
    entradaInvalida: {
      borderWidth: border.widthInvalid,
      paddingVertical: space[2] - diferenca,
      paddingHorizontal: space[3] - diferenca,
    } satisfies TextStyle,
  } as const;
}

/** Mensagem de erro: ícone + texto em negrito, nunca só a cor (DS 5.1 e 8). */
export function LinhaErro({ nativeID, children }: { nativeID: string; children: string }) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  return (
    <View style={estilos.linhaErro}>
      <Icone nome="octagon-alert" cor={colors.error.text} />
      <Texto nativeID={nativeID} nivel="sm" peso="bold" cor="erro" style={estilos.textoErro}>
        {children}
      </Texto>
    </View>
  );
}

export interface PropsCampoRotulado extends PropsCampoBase {
  /** Recebe as props de acessibilidade para espalhar no controle (`TextInput`, `Picker`…). */
  children: (a11y: PropsCampo['campo'], id: string) => ReactNode;
}

/**
 * FormField (DS 5.2): rótulo visível acima, ajuda, o controle e o erro abaixo. Faz a associação
 * de acessibilidade (ADR 0009): rótulo por `aria-labelledby`, ajuda e erro por `aria-describedby`.
 */
export function CampoRotulado({
  rotulo,
  opcional = false,
  ajuda,
  erro,
  id: idDado,
  children,
}: Omit<PropsCampoRotulado, 'desabilitado'>) {
  const estilos = useEstilos(criarEstilos);
  const id = useIdCampo(idDado);
  const propsA11y = propsDeCampo({
    id,
    rotulo: opcional ? `${rotulo} (opcional)` : rotulo,
    erro,
    ajuda,
  });

  return (
    <View style={estilos.campo}>
      <View style={estilos.rotuloEAjuda}>
        <Texto
          {...propsA11y.rotulo}
          peso="bold"
          onPress={Platform.OS === 'web' ? () => focarControle(id) : undefined}
        >
          {rotulo}
          {opcional ? (
            <Texto peso="regular" cor="secundario">
              {' (opcional)'}
            </Texto>
          ) : null}
        </Texto>
        {propsA11y.ajuda ? (
          <Texto {...propsA11y.ajuda} nivel="sm" cor="secundario">
            {ajuda}
          </Texto>
        ) : null}
      </View>
      {children(propsA11y.campo, id)}
      {propsA11y.erro && erro ? (
        <LinhaErro nativeID={propsA11y.erro.nativeID}>{erro}</LinhaErro>
      ) : null}
    </View>
  );
}

/** Na web, clicar no rótulo leva o foco ao campo (como um <label for>); no iPhone o rótulo não é um alvo. */
function focarControle(id: string): void {
  document.getElementById(id)?.focus();
}

/** Estilo da caixa de entrada por estado: padrão, foco, erro e desabilitado (DS 5.1). */
export function useEstiloEntrada(
  invalida: boolean,
  focada: boolean,
  desabilitada: boolean,
): StyleProp<TextStyle> {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const web = Platform.OS === 'web';

  const cores: TextStyle = desabilitada
    ? {
        backgroundColor: colors.disabled.bg,
        borderColor: colors.border.subtle,
        color: colors.disabled.text,
      }
    : {
        backgroundColor: colors.bg.surface,
        borderColor: invalida
          ? colors.error.border
          : focada
            ? colors.text.primary
            : colors.border.control,
        color: colors.text.primary,
      };

  return [
    fonte('base', 'regular'),
    estilos.entrada,
    invalida && estilos.entradaInvalida,
    cores,
    // O anel de foco dos campos é de 2 px de distância (DS 5.1); no iPhone o foco é do sistema.
    web && focada
      ? ({
          outlineStyle: 'solid',
          outlineWidth: ESPESSURA_ANEL,
          outlineColor: colors.focus.ring,
          outlineOffset: DESLOCAMENTO_ANEL,
        } satisfies TextStyle)
      : null,
    web && desabilitada ? ({ cursor: 'not-allowed' } as unknown as TextStyle) : null,
  ];
}

export interface PropsEntradaTexto extends Omit<
  TextInputProps,
  'style' | 'editable' | 'placeholderTextColor'
> {
  /** Props de acessibilidade de `propsDeCampo().campo`. */
  a11y: PropsCampo['campo'];
  desabilitado?: boolean;
  /** Estilo extra (ex.: espaço à direita para o botão de mostrar senha). */
  estiloExtra?: StyleProp<TextStyle>;
  ref?: Ref<TextInput>;
}

/**
 * Caixa de entrada do design system: `TextInput` com borda, estados e a acessibilidade ligada.
 * Altura mínima de 48 px, texto na escala `base` (cresce com o Dynamic Type).
 */
export function EntradaTexto({
  a11y,
  desabilitado = false,
  estiloExtra,
  onFocus,
  onBlur,
  ref,
  ...resto
}: PropsEntradaTexto) {
  const { colors } = useTema();
  const [focada, setFocada] = useState(false);
  const estilo = useEstiloEntrada(a11y['aria-invalid'], focada, desabilitado);

  return (
    <TextInput
      placeholderTextColor={colors.text.muted}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      editable={!desabilitado}
      aria-disabled={desabilitado || undefined}
      {...resto}
      {...a11y}
      ref={ref}
      onFocus={(evento) => {
        setFocada(true);
        onFocus?.(evento);
      }}
      onBlur={(evento) => {
        setFocada(false);
        onBlur?.(evento);
      }}
      style={[estilo, estiloExtra]}
    />
  );
}
