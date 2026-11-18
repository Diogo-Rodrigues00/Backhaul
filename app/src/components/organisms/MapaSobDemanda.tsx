// "Ver no mapa" (card 035, MVP-23, ADR 0017): o botão que abre e fecha o mapa e o painel que o
// carrega por React.lazy no primeiro clique. O mapa é só visualização: toda informação dele existe
// em texto no cartão ou na lista, e nenhuma ação depende dele.
import { lazy, Suspense } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Carregando } from '@/components/atoms/Carregando';
import { Texto } from '@/components/atoms/Texto';
import { LimiteDeErro } from '@/components/molecules/LimiteDeErro';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { carregarMapaRota } from './MapaRota.carregar';
import { ALTURA_MAPA } from './MapaRota.constantes';
import type { PropsMapaRota } from './MapaRota.logica';

// Só é baixado quando o painel monta pela primeira vez, ou seja, depois do clique.
const MapaRota = lazy(carregarMapaRota);

/** `nativeID` do painel: o botão aponta para ele em `aria-controls`. */
export function idDoMapa(chave: string): string {
  return `mapa-${chave}`;
}

export interface PropsBotaoMapa {
  aberto: boolean;
  aoAlternar: () => void;
  /** `nativeID` do painel que o botão abre. */
  idPainel: string;
  /** Rótulo aberto ("Ver no mapa") e fechado; o nome acessível acrescenta `sobre`. */
  rotulo?: string;
  rotuloFechar?: string;
  /** Complemento do nome acessível, para diferenciar botões iguais ("a rota de Soja"). */
  sobre?: string;
}

/**
 * Botão que abre e fecha o mapa. O nome acessível começa com o texto visível (WCAG 2.5.3) e
 * `aria-expanded` diz o estado. O botão continua o mesmo elemento aberto ou fechado, então o foco
 * fica nele ao fechar.
 */
export function BotaoMapa({
  aberto,
  aoAlternar,
  idPainel,
  rotulo = 'Ver no mapa',
  rotuloFechar = 'Fechar mapa',
  sobre,
}: PropsBotaoMapa) {
  const visivel = aberto ? rotuloFechar : rotulo;
  return (
    <Botao
      variante="secundario"
      icone="map"
      aria-expanded={aberto}
      aria-controls={idPainel}
      {...(sobre ? { 'aria-label': `${visivel} ${sobre}` } : null)}
      aoPressionar={aoAlternar}
    >
      {visivel}
    </Botao>
  );
}

function criarEstilos({ space }: TemaVisual) {
  return {
    // Reserva a altura do mapa enquanto o código chega (sem salto de layout).
    carga: {
      minHeight: ALTURA_MAPA,
      justifyContent: 'center',
      padding: space[3],
    } satisfies ViewStyle,
  } as const;
}

/** Painel do mapa: monta o mapa por demanda, com "Carregando o mapa…" enquanto o código chega. */
export function PainelMapa({ idPainel, ...mapa }: PropsMapaRota & { idPainel: string }) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View nativeID={idPainel} role="group" aria-label="Mapa">
      {/* Falha ao baixar o código (rede): só o mapa some; o texto do cartão segue valendo. */}
      <LimiteDeErro
        fallback={
          <Texto role="alert" cor="secundario">
            Não foi possível carregar o mapa. A rota continua descrita no texto.
          </Texto>
        }
      >
        <Suspense
          fallback={
            <View style={estilos.carga}>
              <Carregando texto="Carregando o mapa…" />
            </View>
          }
        >
          <MapaRota {...mapa} />
        </Suspense>
      </LimiteDeErro>
    </View>
  );
}
