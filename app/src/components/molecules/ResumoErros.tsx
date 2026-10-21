import { useEffect, type Ref } from 'react';
import { Platform, Pressable, View, type TextStyle, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Icone } from '@/components/atoms/Icone';
import { Texto } from '@/components/atoms/Texto';
import { anunciar } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

/** Um campo com erro: `campo` é o nome no formulário (o mesmo de `setFocus`). */
export interface ItemResumo {
  campo: string;
  mensagem: string;
}

export interface PropsResumoErros {
  /** Campos com erro: viram links que levam o foco ao campo. */
  itens?: readonly ItemResumo[];
  /** Erros sem campo (409, "erro geral" da API, 500): texto simples. */
  mensagens?: readonly string[];
  /** Leva o foco ao campo (normalmente `setFocus` do react-hook-form). */
  aoFocarCampo: (campo: string) => void;
  /** Mostra o botão "Tentar de novo" (falha de rede ou 500). */
  aoTentarDeNovo?: () => void | Promise<unknown>;
  /** Reenviando: o botão fica "Tentando…" e ignora toques. */
  tentando?: boolean;
  /** Elemento do resumo: recebe o foco depois de um envio com erro. */
  ref?: Ref<View>;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    alerta: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    texto: { flex: 1, flexShrink: 1, minWidth: 0, gap: space[3] } satisfies ViewStyle,
    acoes: { gap: space[3], alignItems: 'flex-start' } satisfies ViewStyle,
    lista: { gap: space[1] } satisfies ViewStyle,
    item: { minHeight: space[6], justifyContent: 'center' } satisfies ViewStyle,
    link: { textDecorationLine: 'underline' } satisfies TextStyle,
  } as const;
}

/** "Corrija 3 campos para continuar." (DS 7). */
export function tituloDoResumo(quantidade: number): string {
  return `Corrija ${quantidade} ${quantidade === 1 ? 'campo' : 'campos'} para continuar.`;
}

/**
 * Resumo de erros do formulário (ErrorSummary, DS 5.2 e 7): o visual do `Banner` de erro (ícone,
 * borda de 2 px, fundo `error.bg`) num único elemento `role="alert"` com `tabIndex={-1}`, no topo do
 * formulário. Não usa o `Banner` porque o foco precisa ir no próprio alerta (`ref` + `tabIndex`), sem
 * um segundo `alert` aninhado, e assim o `Banner`, que vai no JS inicial, não muda. Depois do envio com erro o foco vem para cá (passe o
 * `ref` para `moverFoco`); cada campo com erro é um link que foca o campo. Não aparece (devolve
 * nada) se não houver itens nem mensagens. No iPhone, que não lê o `alert` sozinho, o texto é
 * anunciado.
 */
export function ResumoErros({
  itens = [],
  mensagens = [],
  aoFocarCampo,
  aoTentarDeNovo,
  tentando = false,
  ref,
}: PropsResumoErros) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const titulo = itens.length > 0 ? tituloDoResumo(itens.length) : undefined;
  const textoSoltoUnico = !titulo && mensagens.length === 1 ? mensagens[0] : undefined;
  const lido = [titulo, ...itens.map((i) => i.mensagem), ...mensagens].filter(Boolean).join(' ');

  useEffect(() => {
    // Na web o foco no `role="alert"` já faz o leitor de tela ler; no iPhone é preciso anunciar.
    if (Platform.OS !== 'web' && lido !== '') anunciar(lido);
  }, [lido]);

  if (itens.length === 0 && mensagens.length === 0) return null;

  const corpo =
    itens.length > 0 || (mensagens.length > 1 && !textoSoltoUnico) ? (
      <View role="list" style={estilos.lista}>
        {itens.map((item) => (
          <View key={item.campo} role="listitem" style={estilos.item}>
            <Pressable role="link" onPress={() => aoFocarCampo(item.campo)}>
              <Texto cor="erro" peso="bold" style={estilos.link}>
                {item.mensagem}
              </Texto>
            </Pressable>
          </View>
        ))}
        {mensagens.map((mensagem) => (
          <View key={mensagem} role="listitem" style={estilos.item}>
            <Texto>{mensagem}</Texto>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View
      ref={ref}
      tabIndex={-1}
      role="alert"
      style={[
        estilos.alerta,
        { backgroundColor: colors.error.bg, borderColor: colors.error.border },
      ]}
    >
      <Icone nome="octagon-alert" tamanho="destaque" cor={colors.error.text} />
      <View style={estilos.texto}>
        {titulo ? <Texto peso="bold">{titulo}</Texto> : null}
        {textoSoltoUnico ? <Texto>{textoSoltoUnico}</Texto> : null}
        {corpo}
        {aoTentarDeNovo ? (
          <View style={estilos.acoes}>
            <Botao
              variante="secundario"
              icone="refresh"
              carregando={tentando}
              rotuloCarregando="Tentando…"
              aoPressionar={aoTentarDeNovo}
            >
              Tentar de novo
            </Botao>
          </View>
        ) : null}
      </View>
    </View>
  );
}
