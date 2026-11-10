// Mapa de visualização na web (card 035, ADR 0017): ladrilhos <img> do OpenStreetMap com um <svg>
// por cima (rota, círculo de busca, marcadores). Sem biblioteca, sem CSS externo, sem interação:
// não há pan, zoom nem controle, então nada prende o Tab e não há animação (prefers-reduced-motion).
// Só é baixado depois do clique em "Ver no mapa" (`MapaRota.carregar.ts`).
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { useTema } from '@/state/tema/useTema';
import { colors as colorsDoTema } from '@/theme/tokens';

import {
  ALTURA_MAPA,
  ATRIBUICAO,
  LETRA_DO_TIPO,
  legendaDoMapa,
  montarCena,
  type PropsMapaRota,
} from './MapaRota.logica';

export type { PropsMapaRota } from './MapaRota.logica';

// Os ladrilhos são claros nos dois temas: o desenho por cima usa cores fixas de alto contraste.
const CLARO = colorsDoTema.light;
const TRACO = CLARO.text.link;
const CONTORNO = CLARO.bg.surface;
const TINTA = CLARO.text.primary;
const ALERTA = CLARO.action.fill;

export function MapaRota(props: PropsMapaRota) {
  const { colors } = useTema();
  const area = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const no = area.current;
    if (!no) return;
    const medir = () => setLargura(Math.round(no.clientWidth));
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  // Barato (poucas dezenas de pontos): recalcula a cada render, sem useMemo.
  const cena = largura > 0 ? montarCena(props, largura, ALTURA_MAPA) : null;
  const legenda = legendaDoMapa(props);

  return (
    <View style={{ gap: 8 }}>
      <div
        ref={area}
        role="img"
        aria-label={props.descricao}
        style={{
          position: 'relative',
          width: '100%',
          height: ALTURA_MAPA,
          overflow: 'hidden',
          borderRadius: 8,
          background: colors.bg.sunken,
          border: `1px solid ${colors.border.subtle}`,
        }}
      >
        {cena
          ? cena.ladrilhos.map((l) => (
              <img
                key={l.chave}
                src={l.url}
                alt=""
                width={256}
                height={256}
                decoding="async"
                draggable={false}
                style={{ position: 'absolute', left: l.esquerda, top: l.topo, maxWidth: 'none' }}
              />
            ))
          : null}
        {cena ? (
          <svg
            width={largura}
            height={ALTURA_MAPA}
            aria-hidden="true"
            focusable="false"
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            {cena.circulo ? (
              <circle
                cx={cena.circulo.x}
                cy={cena.circulo.y}
                r={cena.circulo.raio}
                fill={TRACO}
                fillOpacity={0.1}
                stroke={TRACO}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            ) : null}
            {cena.linha.length > 1 ? (
              <>
                <polyline
                  points={cena.linha.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={CONTORNO}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={cena.linha.map((p) => `${p.x},${p.y}`).join(' ')}
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
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={grande ? 12 : 6}
                    fill={p.tipo === 'destino' ? TINTA : ALERTA}
                    stroke={p.tipo === 'destino' ? CONTORNO : TINTA}
                    strokeWidth={2}
                  />
                  {grande ? (
                    <text
                      x={p.x}
                      y={p.y + 5}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={700}
                      fontFamily="sans-serif"
                      fill={p.tipo === 'destino' ? CONTORNO : TINTA}
                    >
                      {LETRA_DO_TIPO[p.tipo]}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>
      {legenda ? <Texto cor="secundario" nivel="caption">{`Legenda: ${legenda}`}</Texto> : null}
      <Texto cor="secundario" nivel="caption">
        {ATRIBUICAO}
      </Texto>
    </View>
  );
}
