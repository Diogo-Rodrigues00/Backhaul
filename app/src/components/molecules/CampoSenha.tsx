import { useState, type Ref } from 'react';
import { Platform, Pressable, View, type TextInput, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { CampoRotulado, EntradaTexto, type PropsCampoBase } from './campoComum';
import type { PropsCampoTexto } from './CampoTexto';

export interface PropsCampoSenha
  extends
    PropsCampoBase,
    Omit<
      PropsCampoTexto,
      keyof PropsCampoBase | 'secureTextEntry' | 'autoComplete' | 'textContentType' | 'ref'
    > {
  /**
   * `senha-atual` (login) ou `nova-senha` (cadastro): troca `autoComplete` e `textContentType`
   * para o gerenciador de senhas do navegador e do iPhone fazer a coisa certa.
   */
  tipo?: 'senha-atual' | 'nova-senha';
  ref?: Ref<TextInput>;
}

// Espaço reservado à direita para o botão não cobrir o texto digitado.
const RESERVA_BOTAO = 112;
// O botão fica 2 px para dentro da borda, com a altura do campo menos a borda.
const FOLGA_BOTAO = 2;

function criarEstilos({ radius, space, touch }: TemaVisual) {
  return {
    caixa: { position: 'relative', justifyContent: 'center' } satisfies ViewStyle,
    entrada: { paddingRight: RESERVA_BOTAO } satisfies ViewStyle,
    botao: {
      position: 'absolute',
      right: FOLGA_BOTAO,
      top: FOLGA_BOTAO,
      bottom: FOLGA_BOTAO,
      minWidth: touch.min,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Campo de senha (PasswordField, DS 5.2): um `CampoTexto` com o botão "Mostrar"/"Ocultar" dentro.
 * O botão tem `aria-pressed`, nome "Mostrar senha"/"Ocultar senha" e alvo de 44 px; fica na ordem
 * do Tab, depois do campo.
 */
export function CampoSenha({
  rotulo,
  opcional,
  ajuda,
  erro,
  id,
  desabilitado,
  tipo = 'senha-atual',
  ref,
  ...resto
}: PropsCampoSenha) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const [visivel, setVisivel] = useState(false);
  const [sobre, setSobre] = useState(false);
  const novaSenha = tipo === 'nova-senha';
  const nomeBotao = visivel ? 'Ocultar senha' : 'Mostrar senha';

  return (
    <CampoRotulado rotulo={rotulo} opcional={opcional} ajuda={ajuda} erro={erro} id={id}>
      {(a11y) => (
        <View style={estilos.caixa}>
          <EntradaTexto
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            {...resto}
            a11y={a11y}
            desabilitado={desabilitado}
            ref={ref}
            secureTextEntry={!visivel}
            autoComplete={novaSenha ? 'new-password' : 'current-password'}
            textContentType={novaSenha ? 'newPassword' : 'password'}
            estiloExtra={estilos.entrada}
          />
          <Pressable
            role="button"
            aria-label={nomeBotao}
            aria-pressed={visivel}
            disabled={desabilitado}
            onPress={() => setVisivel((atual) => !atual)}
            onHoverIn={() => setSobre(true)}
            onHoverOut={() => setSobre(false)}
            style={[
              estilos.botao,
              sobre && { backgroundColor: colors.bg.sunken },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null,
            ]}
          >
            <Texto peso="bold" cor={desabilitado ? 'desabilitado' : 'link'} style={SUBLINHADO}>
              {visivel ? 'Ocultar' : 'Mostrar'}
            </Texto>
          </Pressable>
        </View>
      )}
    </CampoRotulado>
  );
}

// Link sempre sublinhado (DS 5.1): a cor nunca é o único sinal.
const SUBLINHADO = { textDecorationLine: 'underline' } as const;
