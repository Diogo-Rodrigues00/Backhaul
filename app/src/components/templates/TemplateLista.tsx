import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Carregando } from '@/components/atoms/Carregando';
import { Esqueleto } from '@/components/atoms/Esqueleto';
import { BarraNovidades, type PropsBarraNovidades } from '@/components/molecules/BarraNovidades';
import { BotaoAtualizar } from '@/components/molecules/BotaoAtualizar';
import { EstadoErro, type PropsEstadoErro } from '@/components/molecules/EstadoErro';
import { EstadoVazio, type PropsEstadoVazio } from '@/components/molecules/EstadoVazio';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { TemplateTela, type PropsTemplateTela } from './TemplateTela';

export type EstadoLista = 'carregando' | 'erro' | 'vazio' | 'pronto';

export interface PropsConteudoLista {
  estado: EstadoLista;
  /** Frase do estado de carregamento, sempre visível: "Carregando cargas…" (CT-01). */
  textoCarregando: string;
  /** Estado vazio: título, frase e a ação obrigatória (CT-02). */
  vazio?: PropsEstadoVazio;
  /** Estado de erro: mensagem e "Tentar de novo" (CT-03). Sem ele, usa `aoAtualizar` para tentar. */
  erro?: Partial<PropsEstadoErro>;
  /** Mostra o botão "Atualizar". */
  aoAtualizar?: () => void | Promise<unknown>;
  /** Buscando agora: o botão vira "Atualizando…". */
  atualizando?: boolean;
  /** Mostra a barra de novidades (telas com atualização automática). */
  novidade?: PropsBarraNovidades;
  /** A lista, só renderizada em `pronto`. */
  children?: ReactNode;
}

export interface PropsTemplateLista
  extends PropsConteudoLista, Omit<PropsTemplateTela, 'children'> {}

// Altura reservada para carregando, vazio e erro: a lista chega sem empurrar o resto da tela (CLS 0).
const ALTURA_MINIMA = 360;
const ALTURA_ESQUELETO = 112;
const LINHAS_ESQUELETO = 3;
const LARGURA_MINIMA_BARRA = 260;

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    area: { minHeight: ALTURA_MINIMA, gap: space[4] } satisfies ViewStyle,
    topo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: space[3],
    } satisfies ViewStyle,
    barra: { flexGrow: 1, flexShrink: 1, minWidth: LARGURA_MINIMA_BARRA } satisfies ViewStyle,
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Template de lista (ListTemplate): `TemplateTela` + os quatro estados de uma lista de dados
 * (`ConteudoLista`, que também pode ser usado sozinho dentro de um `TemplateTela`).
 * Carregando: spinner + texto + 3 esqueletos num `role="status"`. Vazio: mensagem e ação. Erro:
 * banner com "Tentar de novo". Pronto: a lista. Em telas com polling, a barra de novidades e o
 * botão "Atualizar" ficam acima, e a área tem altura mínima para o estado trocar sem pular.
 */
export function ConteudoLista({
  estado,
  textoCarregando,
  vazio,
  erro,
  aoAtualizar,
  atualizando = false,
  novidade,
  children,
}: PropsConteudoLista) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const mostrarTopo = (estado === 'pronto' || estado === 'vazio') && (novidade || aoAtualizar);

  return (
    <View style={estilos.area} aria-busy={estado === 'carregando' || undefined}>
      {mostrarTopo ? (
        <View style={estilos.topo}>
          {novidade ? (
            <View style={estilos.barra}>
              <BarraNovidades {...novidade} />
            </View>
          ) : null}
          {aoAtualizar ? (
            <BotaoAtualizar aoAtualizar={aoAtualizar} atualizando={atualizando} />
          ) : null}
        </View>
      ) : null}

      {estado === 'carregando' ? (
        <View
          style={[
            estilos.cartao,
            { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
          ]}
        >
          <Carregando texto={textoCarregando} tamanho="grande" />
          {Array.from({ length: LINHAS_ESQUELETO }, (_, indice) => (
            <Esqueleto key={indice} altura={ALTURA_ESQUELETO} />
          ))}
        </View>
      ) : null}

      {estado === 'erro' ? (
        <EstadoErro
          {...erro}
          aoTentarDeNovo={erro?.aoTentarDeNovo ?? aoAtualizar ?? (() => undefined)}
        />
      ) : null}

      {estado === 'vazio' && vazio ? <EstadoVazio {...vazio} /> : null}

      {estado === 'pronto' ? children : null}
    </View>
  );
}

/** `TemplateTela` com o `ConteudoLista` dentro: o caso comum, sem carregamento sob demanda. */
export function TemplateLista({ children, ...props }: PropsTemplateLista) {
  const { estado, textoCarregando, vazio, erro, aoAtualizar, atualizando, novidade, ...tela } =
    props;
  return (
    <TemplateTela {...tela}>
      <ConteudoLista
        estado={estado}
        textoCarregando={textoCarregando}
        vazio={vazio}
        erro={erro}
        aoAtualizar={aoAtualizar}
        atualizando={atualizando}
        novidade={novidade}
      >
        {children}
      </ConteudoLista>
    </TemplateTela>
  );
}
