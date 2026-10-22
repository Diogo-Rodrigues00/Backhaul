// Cartão de carga do motorista (CargaCard motorista, DS 5.3 e 6): faixa de urgência no topo, o
// resumo da carga com distância e, no rodapé, "Proposta enviada" ou as ações de proposta. Não busca
// dados: a tela entrega a carga pronta por props (ADR 0003).
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Etiqueta } from '@/components/atoms/Etiqueta';
import { FaixaUrgencia } from '@/components/atoms/FaixaUrgencia';
import { Texto } from '@/components/atoms/Texto';
import { ResumoCarga } from '@/components/molecules/ResumoCarga';
import { type Coordenada, rotuloDoLocal } from '@/lib/cidades';
import type { NumeroEntrada } from '@/lib/formatacao';
import type { Urgencia } from '@/lib/rotulos';
import { statusEfetivo } from '@/lib/vencimento';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoCargaProxima {
  /** Id da carga: nomeia o título (`aria-labelledby`) e o marcador "Proposta enviada". */
  id: string;
  tipoCarga: string;
  /** Razão social da empresa. */
  empresa: string;
  origem: Coordenada;
  destino: Coordenada;
  pesoKg: NumeroEntrada;
  valorOferecido: NumeroEntrada;
  urgencia: Urgencia;
  /** Nome da certificação exigida; `null` quando não há exigência. */
  certificacao: string | null;
  expiraEm: string;
  /** `distancia_origem_km` como a API devolveu. */
  distanciaKm: NumeroEntrada;
  /** Há proposta pendente do motorista para a carga (D-PO-05): mostra "Proposta enviada", sem ações. */
  propostaEnviada?: boolean;
  /** Ações de proposta ("Aceitar R$ X", "Contraproposta"): preenchidas pelo card 025. */
  acoes?: ReactNode;
  /** Relógio para o status efetivo (CT-10). Padrão: agora. Injetável para teste. */
  agora?: Date;
}

/** Texto do ponto sem cidade na lista (coordenada fora do mapa). */
export const LOCAL_NAO_IDENTIFICADO = 'Local não identificado';
export const TEXTO_PROPOSTA_ENVIADA = 'Proposta enviada';

/** `nativeID` do marcador "Proposta enviada" da carga (o card 025 leva o foco até ele). */
export function idPropostaEnviada(cargaId: string): string {
  return `proposta-enviada-${cargaId}`;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      overflow: 'hidden',
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    // Expirada (CT-10, DS 6): borda tracejada e fundo rebaixado; sem faixa nem ações.
    expirado: { borderStyle: 'dashed' } satisfies ViewStyle,
    corpo: { gap: space[4], padding: space[5] } satisfies ViewStyle,
    rodape: { gap: space[2] } satisfies ViewStyle,
    acoes: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space[3],
    } satisfies ViewStyle,
  } as const;
}

/**
 * Carga perto do motorista: `article` rotulado pelo tipo da carga (h2). Na ordem de leitura vêm
 * primeiro o selo de urgência, depois o tipo, a empresa e a rota, e por fim o preço e a distância.
 * Urgente leva faixa âmbar e Crítico faixa de obra (DS 6); Normal e Expirada não levam faixa.
 */
export function CartaoCargaProxima({
  id,
  tipoCarga,
  empresa,
  origem,
  destino,
  pesoKg,
  valorOferecido,
  urgencia,
  certificacao,
  expiraEm,
  distanciaKm,
  propostaEnviada = false,
  acoes,
  agora,
}: PropsCartaoCargaProxima) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const expirado = statusEfetivo('aberto', expiraEm, agora) === 'expirado';
  const idTitulo = `carga-${id}-titulo`;
  // Borda do cartão por urgência (DS 6): asfalto no claro e âmbar/vermelho no escuro; Normal, comum.
  const cor =
    expirado || urgencia === 'normal' ? colors.border.subtle : colors.urgency[urgencia].border;

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        expirado ? estilos.expirado : null,
        {
          backgroundColor: expirado ? colors.bg.sunken : colors.bg.surface,
          borderColor: cor,
        },
      ]}
    >
      {expirado ? null : <FaixaUrgencia urgencia={urgencia} />}
      <View style={estilos.corpo}>
        <ResumoCarga
          idTitulo={idTitulo}
          tipoCarga={tipoCarga}
          empresa={empresa}
          origem={rotuloDoLocal(origem) ?? LOCAL_NAO_IDENTIFICADO}
          destino={rotuloDoLocal(destino) ?? LOCAL_NAO_IDENTIFICADO}
          pesoKg={pesoKg}
          valorOferecido={valorOferecido}
          urgencia={urgencia}
          certificacao={certificacao}
          expiraEm={expiraEm}
          distanciaKm={distanciaKm}
          agora={agora}
        />
        {expirado ? null : propostaEnviada ? (
          <View style={estilos.rodape} nativeID={idPropostaEnviada(id)}>
            <Etiqueta variante="ok" icone="check">
              {TEXTO_PROPOSTA_ENVIADA}
            </Etiqueta>
            <Texto cor="secundario">{`Aguardando a resposta de ${empresa}.`}</Texto>
          </View>
        ) : acoes ? (
          <View style={estilos.acoes}>{acoes}</View>
        ) : null}
      </View>
    </View>
  );
}
