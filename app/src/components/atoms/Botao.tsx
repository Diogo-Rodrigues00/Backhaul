import { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  type View,
  type GestureResponderEvent,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';
import type { Papeis } from '@/theme/variaveis';

import { GiroCarregando } from './GiroCarregando';
import { Icone } from './Icone';
import type { NomeIcone } from './icones';
import { Texto } from './Texto';
import { corDoTexto, type CorTexto } from './corTexto';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'texto';
export type TamanhoBotao = 'md' | 'lg';

export interface PropsBotao extends Omit<
  PressableProps,
  'children' | 'style' | 'disabled' | 'onPress'
> {
  /** Rótulo: sempre texto, com verbo no infinitivo ("Publicar carga"). */
  children: string;
  variante?: VarianteBotao;
  /** `md` = 48 px; `lg` = 56 px (botão principal do motorista). */
  tamanho?: TamanhoBotao;
  /** Ocupa toda a largura disponível. */
  bloco?: boolean;
  /** Ícone à esquerda, decorativo (o rótulo é o nome acessível). */
  icone?: NomeIcone;
  /**
   * Enviando: mostra o giro e `rotuloCarregando`, vira `aria-busy` + `aria-disabled` e ignora toques
   * (1 clique = 1 requisição). Mantém o foco, ao contrário de `desabilitado`.
   */
  carregando?: boolean;
  /** Rótulo durante o envio ("Publicando…"). */
  rotuloCarregando?: string;
  /** `disabled` de verdade: sai da ordem de foco e ignora toques. */
  desabilitado?: boolean;
  /**
   * Toque. Se devolver uma Promise, novos toques são ignorados até ela terminar, mesmo antes de o pai
   * marcar `carregando` (protege o clique duplo).
   */
  aoPressionar?: (evento: GestureResponderEvent) => void | Promise<unknown>;
  /** Mesmo que `aoPressionar`; existe para o `Link` com `asChild` do expo-router. */
  onPress?: PressableProps['onPress'];
}

export type EstadoVisual = 'padrao' | 'hover' | 'pressionado' | 'desabilitado';

export interface Aparencia {
  fundo: string;
  borda: string;
  texto: CorTexto;
}

// DS 5.1 (Button) e protótipo (.btn): o que muda por variante e estado. Só papéis de cor.
// Exportada para o teste conferir a tabela do DS.
export function aparencia(
  colors: Papeis,
  variante: VarianteBotao,
  estado: EstadoVisual,
): Aparencia {
  if (estado === 'desabilitado') {
    return {
      fundo: variante === 'texto' ? 'transparent' : colors.disabled.bg,
      borda: variante === 'texto' ? 'transparent' : colors.border.subtle,
      texto: 'desabilitado',
    };
  }
  const hover = estado === 'hover';
  const pressionado = estado === 'pressionado';
  switch (variante) {
    case 'primario':
      return {
        fundo: pressionado
          ? colors.action.fillPressed
          : hover
            ? colors.action.fillHover
            : colors.action.fill,
        borda: colors.action.border,
        texto: 'sobreAcao',
      };
    case 'secundario':
      return {
        fundo: pressionado ? colors.border.subtle : hover ? colors.bg.sunken : colors.bg.surface,
        borda: hover || pressionado ? colors.text.primary : colors.border.control,
        texto: 'primario',
      };
    case 'perigo':
      return {
        fundo: hover || pressionado ? colors.error.bg : colors.bg.surface,
        borda: pressionado ? colors.error.text : colors.error.border,
        texto: 'erro',
      };
    case 'texto':
      return {
        fundo: hover || pressionado ? colors.bg.sunken : 'transparent',
        borda: 'transparent',
        texto: 'primario',
      };
  }
}

export function estadoVisual(inativo: boolean, pressed: boolean, hovered?: boolean): EstadoVisual {
  if (inativo) return 'desabilitado';
  if (pressed) return 'pressionado';
  return hovered ? 'hover' : 'padrao';
}

// Pressionado desce 1 px (DS); com movimento reduzido só a cor muda.
const DESLOCAMENTO_PRESSIONADO = 1;
// DS 5.1: o rótulo do botão de texto é sublinhado com 2 px (só a web aceita a espessura).
const ESPESSURA_SUBLINHADO = 2;

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      minHeight: touch.control,
      minWidth: touch.control,
      paddingVertical: space[2],
      paddingHorizontal: space[5],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    lg: { minHeight: touch.primary, paddingHorizontal: space[6] } satisfies ViewStyle,
    texto: { paddingHorizontal: space[3] } satisfies ViewStyle,
    bloco: { alignSelf: 'stretch', width: '100%' } satisfies ViewStyle,
    rotulo: { flexShrink: 1, textAlign: 'center' } satisfies TextStyle,
    sublinhado: {
      textDecorationLine: 'underline',
      textDecorationThickness: ESPESSURA_SUBLINHADO,
      textUnderlineOffset: space[1],
    } as TextStyle,
  } as const;
}

// O tipo de `cursor` do React Native só prevê auto e pointer; o react-native-web aceita o CSS inteiro.
function cursorWeb(valor: string): ViewStyle {
  return { cursor: valor } as ViewStyle;
}

function ehPromessa(valor: unknown): valor is Promise<unknown> {
  return typeof (valor as { then?: unknown } | null)?.then === 'function';
}

/**
 * Botão do design system (Button): variantes primário, secundário, perigo e texto; tamanhos md 48 e
 * lg 56; estados padrão, hover, foco, pressionado, desabilitado e carregando. Na web é um
 * `<button>`; no iPhone, "botão" para o VoiceOver. O rótulo é sempre texto.
 */
export function Botao({
  children,
  variante = 'primario',
  tamanho = 'md',
  bloco = false,
  icone,
  carregando = false,
  rotuloCarregando = 'Carregando…',
  desabilitado = false,
  aoPressionar,
  onPress,
  ...resto
}: PropsBotao) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const reduzido = useMovimentoReduzido();
  // Trava local: o pai só marca `carregando` no render seguinte, e o segundo toque pode chegar antes.
  const emVoo = useRef(false);
  const elemento = useRef<View>(null);

  const inativo = desabilitado || carregando;
  const acao = aoPressionar ?? onPress;

  const aoToque = useCallback(
    (evento: GestureResponderEvent) => {
      if (inativo || emVoo.current) return;
      const resultado = (acao as ((e: GestureResponderEvent) => unknown) | undefined)?.(evento);
      if (ehPromessa(resultado)) {
        emVoo.current = true;
        const liberar = () => {
          emVoo.current = false;
        };
        resultado.then(liberar, liberar);
      }
    },
    [acao, inativo],
  );

  // Web: o react-native-web amarra `aria-disabled` ao `disabled` do <button>, que tira o foco do
  // botão no meio do envio. O DS pede só `aria-disabled` em `carregando` (o foco fica), então o
  // atributo é posto direto no elemento.
  useEffect(() => {
    const no = elemento.current as unknown as Partial<Element> | null;
    if (Platform.OS !== 'web' || desabilitado || !no?.setAttribute) return;
    if (carregando) no.setAttribute('aria-disabled', 'true');
    else no.removeAttribute?.('aria-disabled');
  }, [carregando, desabilitado]);

  const rotulo = carregando ? rotuloCarregando : children;

  return (
    <Pressable
      role="button"
      aria-busy={carregando || undefined}
      aria-disabled={inativo || undefined}
      disabled={desabilitado || undefined}
      {...resto}
      ref={elemento}
      onPress={aoToque}
      style={({ pressed, hovered }) => {
        const estado = estadoVisual(inativo, pressed, hovered);
        const cores = aparencia(colors, variante, estado);
        return [
          estilos.base,
          tamanho === 'lg' && estilos.lg,
          variante === 'texto' && estilos.texto,
          bloco && estilos.bloco,
          { backgroundColor: cores.fundo, borderColor: cores.borda },
          Platform.OS === 'web' &&
            cursorWeb(desabilitado ? 'not-allowed' : carregando ? 'progress' : 'pointer'),
          estado === 'pressionado' &&
            !reduzido && { transform: [{ translateY: DESLOCAMENTO_PRESSIONADO }] },
        ];
      }}
    >
      {({ pressed, hovered }) => {
        const estado = estadoVisual(inativo, pressed, hovered);
        const cor = aparencia(colors, variante, estado).texto;
        return (
          <>
            {carregando ? (
              <GiroCarregando cor={corDoTexto(colors, cor)} />
            ) : icone ? (
              <Icone nome={icone} cor={corDoTexto(colors, cor)} />
            ) : null}
            <Texto
              peso="bold"
              cor={cor}
              style={[estilos.rotulo, variante === 'texto' && estilos.sublinhado]}
            >
              {rotulo}
            </Texto>
          </>
        );
      }}
    </Pressable>
  );
}
