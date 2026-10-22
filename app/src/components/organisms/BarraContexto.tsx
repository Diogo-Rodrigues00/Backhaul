// Barra de contexto (ContextBar, DS 5.3): diz de onde a busca de "Cargas próximas" parte (local,
// raio e validade da disponibilidade ativa) e leva a "Trocar disponibilidade". Não busca dados: a
// tela entrega a ativa pronta por props (ADR 0003).
import { View, type ViewStyle } from 'react-native';

import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { type Coordenada, rotuloDoLocal } from '@/lib/cidades';
import { formatarDataHora, type NumeroEntrada } from '@/lib/formatacao';
import { rotuloRaio } from '@/components/organisms/CartaoDisponibilidade';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsBarraContexto {
  local: Coordenada;
  raioKm: NumeroEntrada;
  /** Prazo da disponibilidade ativa (`expira_em`). */
  expiraEm: string;
}

/** Texto do local quando o ponto não tem cidade na lista (coordenada fora do mapa). */
export const LOCAL_BUSCA_SEM_CIDADE = 'o local da disponibilidade';

/** "Buscando perto de Uberlândia - MG, raio de 80 km, até 22/10/2026, 18:00". */
export function descreverBusca({ local, raioKm, expiraEm }: PropsBarraContexto): string {
  const cidade = rotuloDoLocal(local) ?? LOCAL_BUSCA_SEM_CIDADE;
  return `Buscando perto de ${cidade}, raio de ${rotuloRaio(raioKm)}, até ${formatarDataHora(expiraEm)}`;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    barra: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
      padding: space[4],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    texto: { flexGrow: 1, flexShrink: 1, flexBasis: 260 } satisfies ViewStyle,
  } as const;
}

/**
 * Local, raio e validade usados na busca, em texto completo (não só ícone), e o link "Trocar
 * disponibilidade" para `/motorista/disponibilidades`.
 */
export function BarraContexto(props: PropsBarraContexto) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();

  return (
    <View
      role="region"
      aria-label="Disponibilidade usada na busca"
      style={[
        estilos.barra,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <Texto style={estilos.texto}>{descreverBusca(props)}</Texto>
      <Link
        href="/motorista/disponibilidades"
        variante="botao"
        aparencia={{ variante: 'secundario' }}
      >
        Trocar disponibilidade
      </Link>
    </View>
  );
}
