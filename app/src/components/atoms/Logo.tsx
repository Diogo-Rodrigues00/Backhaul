import { Link as LinkDoRouter } from 'expo-router';
import { Pressable, type TextStyle, type ViewStyle } from 'react-native';

import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { type } from '@/theme/tokens';

import { Desenho } from './Icone';
import { Texto } from './Texto';
import { simbolo, VIEWBOX_SIMBOLO } from './simbolo';

export interface PropsLogo {
  /** `horizontal` = símbolo + nome (padrão); `simbolo` = só o losango. */
  variante?: 'horizontal' | 'simbolo';
  /** Sobre o cabeçalho asfalto: o nome usa o texto claro (`logotipo-sobre-escuro.svg`). */
  sobreInverso?: boolean;
}

// DS seção 2: símbolo de 40 px no cabeçalho (mínimo 24 px); nome em Barlow Bold, caixa alta,
// espaçamento de letras 0,09 em (protótipo: 22 px, `type.xl` é o degrau mais próximo na escala).
const LADO_SIMBOLO = 40;
const ESPACAMENTO_LETRAS_EM = 0.09;

function criarEstilos({ radius, space, touch }: TemaVisual) {
  return {
    link: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: touch.min,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    nome: {
      textTransform: 'uppercase',
      letterSpacing: type.xl.size * ESPACAMENTO_LETRAS_EM,
    } satisfies TextStyle,
  } as const;
}

/**
 * Logo (Logo): link para a tela inicial, nome acessível "Backhaul, início". O nome visível
 * ("BACKHAUL") está contido no nome acessível (WCAG 2.5.3). Desenho em SVG, sem imagem raster.
 */
export function Logo({ variante = 'horizontal', sobreInverso = false }: PropsLogo) {
  const estilos = useEstilos(criarEstilos);

  return (
    <LinkDoRouter href="/" asChild>
      <Pressable role="link" aria-label="Backhaul, início" style={estilos.link}>
        <Desenho formas={simbolo} viewBox={VIEWBOX_SIMBOLO} tamanho={LADO_SIMBOLO} />
        {variante === 'horizontal' ? (
          <Texto
            nivel="xl"
            peso="bold"
            cor={sobreInverso ? 'sobreInverso' : 'primario'}
            style={estilos.nome}
          >
            Backhaul
          </Texto>
        ) : null}
      </Pressable>
    </LinkDoRouter>
  );
}
