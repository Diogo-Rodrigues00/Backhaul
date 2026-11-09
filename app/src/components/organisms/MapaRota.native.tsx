// Mapa de visualização no iPhone (card 035, ADR 0017): os mesmos ladrilhos do OpenStreetMap em
// `Image` com um `Svg` por cima (rota, círculo de busca, marcadores). Sem `react-native-maps`, então
// roda no Expo Go sem módulo nativo extra. Sem interação: nada prende o foco do VoiceOver e não há
// animação. Para o leitor de tela é um bloco só, com a descrição; o texto da tela traz o conteúdo.
import { useState } from 'react';
import { Image, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Polyline, Text as TextoSvg } from 'react-native-svg';

import { Texto } from '@/components/atoms/Texto';
import { useTema } from '@/state/tema/useTema';

import {
  ALTURA_MAPA,
  ATRIBUICAO,
  LETRA_DO_TIPO,
  legendaDoMapa,
  montarCena,
  type PropsMapaRota,
} from './MapaRota.logica';

export type { PropsMapaRota } from './MapaRota.logica';

const TRACO = '#0F4C9A';
const CONTORNO = '#FFFFFF';
const TINTA = '#14181D';
const ALERTA = '#FFB300';

export function MapaRota(props: PropsMapaRota) {
  const { colors } = useTema();
  const [largura, setLargura] = useState(0);

  // Barato (poucas dezenas de pontos): recalcula a cada render, sem useMemo.
  const cena = largura > 0 ? montarCena(props, largura, ALTURA_MAPA) : null;
  const legenda = legendaDoMapa(props);
  const pontosDaLinha = cena?.linha.map((p) => `${p.x},${p.y}`).join(' ') ?? '';

  return (
    <View style={{ gap: 8 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={props.descricao}
        importantForAccessibility="no-hide-descendants"
        onLayout={(e: LayoutChangeEvent) => setLargura(Math.round(e.nativeEvent.layout.width))}
        style={{
          width: '100%',
          height: ALTURA_MAPA,
          overflow: 'hidden',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.bg.sunken,
        }}
      >
        {cena
          ? cena.ladrilhos.map((l) => (
              <Image
                key={l.chave}
                source={{ uri: l.url }}
                accessible={false}
                style={{
                  position: 'absolute',
                  left: l.esquerda,
                  top: l.topo,
                  width: 256,
                  height: 256,
                }}
              />
            ))
          : null}
        {cena ? (
          <Svg
            width={largura}
            height={ALTURA_MAPA}
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            {cena.circulo ? (
              <Circle
                cx={cena.circulo.x}
                cy={cena.circulo.y}
                r={cena.circulo.raio}
                fill="rgba(15,76,154,0.10)"
                stroke={TRACO}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            ) : null}
            {cena.linha.length > 1 ? (
              <>
                <Polyline
                  points={pontosDaLinha}
                  fill="none"
                  stroke={CONTORNO}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points={pontosDaLinha}
                  fill="none"
                  stroke={TRACO}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {cena.pontos.map((p, i) => {
              const grande = p.tipo !== 'carga';
              return (
                <G key={i}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={grande ? 12 : 6}
                    fill={p.tipo === 'destino' ? TINTA : ALERTA}
                    stroke={p.tipo === 'destino' ? CONTORNO : TINTA}
                    strokeWidth={2}
                  />
                  {grande ? (
                    <TextoSvg
                      x={p.x}
                      y={p.y + 5}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight="700"
                      fill={p.tipo === 'destino' ? CONTORNO : TINTA}
                    >
                      {LETRA_DO_TIPO[p.tipo]}
                    </TextoSvg>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      {legenda ? <Texto cor="secundario" nivel="caption">{`Legenda: ${legenda}`}</Texto> : null}
      <Texto cor="secundario" nivel="caption">
        {ATRIBUICAO}
      </Texto>
    </View>
  );
}
