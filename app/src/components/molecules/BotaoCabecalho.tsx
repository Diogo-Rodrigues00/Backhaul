import { Platform, Pressable, type ViewStyle } from 'react-native';

import { Icone } from '@/components/atoms/Icone';
import type { NomeIcone } from '@/components/atoms/icones';
import { Texto } from '@/components/atoms/Texto';
import { corDoTexto } from '@/components/atoms/corTexto';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { Responsivo } from './Responsivo';

export interface PropsBotaoCabecalho {
  icone: NomeIcone;
  /** Nome acessível. Sempre presente: no celular o botão mostra só o ícone. */
  rotulo: string;
  /** Texto visível ao lado do ícone; some abaixo de 960 px. Sem ele, só o ícone. */
  texto?: string;
  aoPressionar: () => void;
}

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      minHeight: touch.min,
      minWidth: touch.min,
      paddingHorizontal: space[3],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Botão do cabeçalho asfalto (`.hbtn` do protótipo): contorno claro, ícone e texto opcional.
 * Alvo de 44 px (`touch.min`). Só serve sobre fundo `bg.inverse`.
 */
export function BotaoCabecalho({ icone, rotulo, texto, aoPressionar }: PropsBotaoCabecalho) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const cor = corDoTexto(colors, 'sobreInverso');

  return (
    <Pressable
      role="button"
      aria-label={rotulo}
      onPress={aoPressionar}
      style={({ hovered, pressed }) => [
        estilos.botao,
        {
          borderColor: hovered || pressed ? colors.text.onInverse : colors.text.onInverseMuted,
        },
        Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
      ]}
    >
      <Icone nome={icone} cor={cor} />
      {texto ? (
        <Responsivo bp="sem-barra">
          <Texto nivel="sm" peso="bold" cor="sobreInverso">
            {texto}
          </Texto>
        </Responsivo>
      ) : null}
    </Pressable>
  );
}
