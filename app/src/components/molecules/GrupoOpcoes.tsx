import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Platform, Pressable, View, type TextStyle, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import { SeloUrgencia } from '@/components/atoms/SeloUrgencia';
import { Texto } from '@/components/atoms/Texto';
import { moverFoco, propsDeCampo } from '@/lib/a11y';
import type { Urgencia } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { LinhaErro, useIdCampo } from './campoComum';

export interface OpcaoGrupo<Valor extends string = string> {
  /** Valor devolvido em `aoMudar` (igual ao do contrato da API, ex.: `critico`). */
  valor: Valor;
  /** Texto da opção. Também é o nome acessível, mesmo com o selo de urgência. */
  rotulo: string;
  /** Mostra o `SeloUrgencia` dentro da opção (UrgencyPicker). */
  urgencia?: Urgencia;
  desabilitada?: boolean;
}

export interface PropsGrupoOpcoes<Valor extends string = string> {
  /** Legenda visível do grupo ("Urgência", "Prazo"). É o nome do `radiogroup`. */
  legenda: string;
  opcoes: readonly OpcaoGrupo<Valor>[];
  /** Opção marcada; `null` ou `undefined` = nenhuma. */
  valor: Valor | null | undefined;
  aoMudar: (valor: Valor) => void;
  ajuda?: string;
  erro?: string;
  id?: string;
  desabilitado?: boolean;
  /** Leva o foco do teclado à opção marcada (ou à primeira): o react-hook-form usa para o erro. */
  ref?: Ref<{ focus: () => void }>;
}

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    grupo: { gap: space[2], minWidth: 0 } satisfies ViewStyle,
    cabeca: { gap: space[1] } satisfies ViewStyle,
    opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] } satisfies ViewStyle,
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: touch.control,
      minWidth: touch.control,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    rotulo: { flexShrink: 1 } satisfies TextStyle,
  } as const;
}

type EventoTecla = { key?: string; nativeEvent?: { key?: string }; preventDefault?: () => void };

// Setas movem a escolha, como em qualquer grupo de rádios (web). O iPhone não usa teclado.
function passoDaTecla(evento: EventoTecla): 1 | -1 | 0 {
  const tecla = evento.key ?? evento.nativeEvent?.key;
  if (tecla === 'ArrowRight' || tecla === 'ArrowDown') return 1;
  if (tecla === 'ArrowLeft' || tecla === 'ArrowUp') return -1;
  return 0;
}

/**
 * Escolha única entre poucas opções (ChoiceChip, UrgencyPicker, DeadlinePicker; DS 5.1 e 5.2).
 * `role="radiogroup"` com legenda; cada opção é `role="radio"` com `aria-checked`. A escolhida tem
 * fundo `bg.highlight`, borda escura E um check: a seleção nunca é só cor. Só a opção marcada
 * (ou a primeira, se nenhuma) está na ordem do Tab; as setas trocam a escolha.
 */
export function GrupoOpcoes<Valor extends string = string>({
  legenda,
  opcoes,
  valor,
  aoMudar,
  ajuda,
  erro,
  id: idDado,
  desabilitado = false,
  ref,
}: PropsGrupoOpcoes<Valor>) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const id = useIdCampo(idDado);
  const a11y = propsDeCampo({ id, rotulo: legenda, erro, ajuda });
  const elementos = useRef<(View | null)[]>([]);
  const [focada, setFocada] = useState<number | null>(null);
  const web = Platform.OS === 'web';

  const ativas = opcoes.flatMap((opcao, indice) =>
    opcao.desabilitada || desabilitado ? [] : [indice],
  );
  const indiceMarcado = opcoes.findIndex((opcao) => opcao.valor === valor);
  // Quem entra no Tab: a marcada (se puder ser usada) ou a primeira que pode.
  const indiceDoTab = ativas.includes(indiceMarcado) ? indiceMarcado : (ativas[0] ?? -1);

  useImperativeHandle(ref, () => ({
    focus: () => moverFoco({ current: elementos.current[Math.max(indiceDoTab, 0)] ?? null }),
  }));

  function mover(indiceAtual: number, passo: 1 | -1) {
    const posicao = ativas.indexOf(indiceAtual);
    if (posicao === -1 || ativas.length === 0) return;
    const proximo = ativas[(posicao + passo + ativas.length) % ativas.length];
    const opcao = proximo === undefined ? undefined : opcoes[proximo];
    if (proximo === undefined || !opcao) return;
    aoMudar(opcao.valor);
    moverFoco({ current: elementos.current[proximo] ?? null });
  }

  return (
    <View
      role="radiogroup"
      aria-labelledby={a11y.rotulo.nativeID}
      aria-describedby={a11y.campo['aria-describedby']}
      aria-invalid={a11y.campo['aria-invalid']}
      aria-disabled={desabilitado || undefined}
      nativeID={id}
      accessibilityLabel={legenda}
      accessibilityHint={a11y.campo.accessibilityHint}
      style={estilos.grupo}
    >
      <View style={estilos.cabeca}>
        <Texto {...a11y.rotulo} peso="bold">
          {legenda}
        </Texto>
        {a11y.ajuda ? (
          <Texto {...a11y.ajuda} nivel="sm" cor="secundario">
            {ajuda}
          </Texto>
        ) : null}
      </View>
      <View style={estilos.opcoes}>
        {opcoes.map((opcao, indice) => {
          const marcada = indice === indiceMarcado;
          const inativa = desabilitado || Boolean(opcao.desabilitada);
          const comFoco = web && focada === indice;
          const eventosDeTeclado = web
            ? {
                onKeyDown: (evento: EventoTecla) => {
                  const passo = passoDaTecla(evento);
                  if (passo === 0) return;
                  evento.preventDefault?.();
                  mover(indice, passo);
                },
              }
            : {};
          return (
            <Pressable
              key={opcao.valor}
              ref={(no) => {
                elementos.current[indice] = no;
              }}
              role="radio"
              aria-label={opcao.rotulo}
              aria-checked={marcada}
              aria-disabled={inativa || undefined}
              disabled={inativa}
              tabIndex={indice === indiceDoTab ? 0 : -1}
              onPress={() => aoMudar(opcao.valor)}
              onFocus={() => setFocada(indice)}
              onBlur={() => setFocada((atual) => (atual === indice ? null : atual))}
              {...eventosDeTeclado}
              style={({ hovered }) => [
                estilos.opcao,
                {
                  backgroundColor: inativa
                    ? colors.disabled.bg
                    : marcada
                      ? colors.bg.highlight
                      : colors.bg.surface,
                  borderColor: inativa
                    ? colors.border.subtle
                    : marcada || hovered
                      ? colors.text.primary
                      : colors.border.control,
                },
                web && !inativa ? ({ cursor: 'pointer' } as ViewStyle) : null,
                comFoco
                  ? ({
                      outlineStyle: 'solid',
                      outlineWidth: 3,
                      outlineColor: colors.focus.ring,
                      outlineOffset: 3,
                    } satisfies ViewStyle)
                  : null,
              ]}
            >
              {marcada ? (
                <Icone nome="check" cor={inativa ? colors.disabled.text : colors.text.primary} />
              ) : null}
              {opcao.urgencia ? (
                <SeloUrgencia urgencia={opcao.urgencia} />
              ) : (
                <Texto
                  peso="bold"
                  cor={inativa ? 'desabilitado' : 'primario'}
                  style={estilos.rotulo}
                >
                  {opcao.rotulo}
                </Texto>
              )}
            </Pressable>
          );
        })}
      </View>
      {a11y.erro && erro ? <LinhaErro nativeID={a11y.erro.nativeID}>{erro}</LinhaErro> : null}
    </View>
  );
}
