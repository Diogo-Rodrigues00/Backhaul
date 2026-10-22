// Cartão de carga da empresa (CargaCard empresa, DS 5.2): o resumo da carga, o contador de propostas
// e o link "Ver propostas". Não busca dados: a tela entrega a carga pronta por props (ADR 0003).
import { Link as LinkDoRouter } from 'expo-router';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Texto } from '@/components/atoms/Texto';
import { TextoOculto } from '@/components/atoms/TextoOculto';
import { ResumoCarga } from '@/components/molecules/ResumoCarga';
import { type Coordenada, rotuloDoLocal } from '@/lib/cidades';
import type { NumeroEntrada } from '@/lib/formatacao';
import type { StatusCarga, Urgencia } from '@/lib/rotulos';
import { statusEfetivo } from '@/lib/vencimento';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoCargaEmpresa {
  /** Id da carga: vai no link "Ver propostas" (`?id=`). */
  id: string;
  tipoCarga: string;
  origem: Coordenada;
  destino: Coordenada;
  pesoKg: NumeroEntrada;
  valorOferecido: NumeroEntrada;
  urgencia: Urgencia;
  /** Nome da certificação exigida; `null` quando não há exigência. */
  certificacao: string | null;
  expiraEm: string;
  status: StatusCarga;
  totalPropostas: number;
  /** Relógio para o status efetivo (CT-10). Padrão: agora. Injetável para teste. */
  agora?: Date;
}

/** Texto de rota quando o ponto não tem cidade (coordenada inválida). */
export const LOCAL_NAO_IDENTIFICADO = 'Local não identificado';

export function rotuloPropostas(total: number): string {
  return total === 1 ? '1 proposta' : `${total} propostas`;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    // Expirada (CT-10, DS 6): borda tracejada e fundo rebaixado; sem destaque de urgência.
    expirado: { borderStyle: 'dashed' } satisfies ViewStyle,
    rodape: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    } satisfies ViewStyle,
  } as const;
}

/**
 * Carga da empresa: `article` com o nome do tipo (h2 oculto, por causa do `ResumoCarga`, que mostra
 * o tipo sem título semântico), o resumo, "N propostas" e "Ver propostas" com nome único por carga.
 */
export function CartaoCargaEmpresa({
  id,
  tipoCarga,
  origem,
  destino,
  pesoKg,
  valorOferecido,
  urgencia,
  certificacao,
  expiraEm,
  status,
  totalPropostas,
  agora,
}: PropsCartaoCargaEmpresa) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const expirado = statusEfetivo(status, expiraEm, agora) === 'expirado';
  const idTitulo = `carga-${id}-titulo`;

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        expirado ? estilos.expirado : null,
        {
          backgroundColor: expirado ? colors.bg.sunken : colors.bg.surface,
          borderColor: colors.border.subtle,
        },
      ]}
    >
      <TextoOculto nativeID={idTitulo} role="heading" aria-level={2}>
        {tipoCarga}
      </TextoOculto>
      <ResumoCarga
        tipoCarga={tipoCarga}
        origem={rotuloDoLocal(origem) ?? LOCAL_NAO_IDENTIFICADO}
        destino={rotuloDoLocal(destino) ?? LOCAL_NAO_IDENTIFICADO}
        pesoKg={pesoKg}
        valorOferecido={valorOferecido}
        urgencia={urgencia}
        certificacao={certificacao}
        expiraEm={expiraEm}
        status={status}
        agora={agora}
      />
      <View style={estilos.rodape}>
        <Texto cor="secundario">{rotuloPropostas(totalPropostas)}</Texto>
        <LinkDoRouter href={{ pathname: '/empresa/cargas/detalhe', params: { id } }} asChild>
          <Botao role="link" variante="secundario" aria-label={`Ver propostas de ${tipoCarga}`}>
            Ver propostas
          </Botao>
        </LinkDoRouter>
      </View>
    </View>
  );
}
