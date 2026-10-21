import Head from 'expo-router/head';
import { useRef, type ReactNode } from 'react';
import { Platform, ScrollView, View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import type { ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import { ID_CONTEUDO } from '@/components/molecules/PularParaConteudo';
import { BarraAbas } from '@/components/organisms/BarraAbas';
import { useFocoNoTitulo } from '@/hooks/useFocoNoTitulo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export interface PropsTemplateTela {
  /** O `h1` e o `<title>` da rota ("Minhas cargas"). Único por rota. */
  titulo: string;
  /** Uma frase sob o título e a `meta description`. Também no HTML estático (LCP, ADR 0011). */
  descricao: string;
  /** O `<Cabecalho>` da tela (simples ou completo). */
  cabecalho: ReactNode;
  /** Botões à direita do título (ex.: "Publicar carga"). */
  acoes?: ReactNode;
  /** Itens da barra inferior. Presente = usuário logado; ausente = telas públicas, sem barra. */
  abas?: readonly ItemNavegacao[];
  children?: ReactNode;
}

const LARGURA_MAXIMA = 1120;

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    raiz: { flex: 1, backgroundColor: colors.bg.page } satisfies ViewStyle,
    rolagem: { flexGrow: 1 } satisfies ViewStyle,
    principal: { flex: 1, width: '100%' } satisfies ViewStyle,
    miolo: {
      width: '100%',
      maxWidth: LARGURA_MAXIMA,
      alignSelf: 'center',
      flexGrow: 1,
      paddingTop: space[8],
      paddingBottom: space[12],
      paddingHorizontal: space[6],
      gap: space[6],
    } satisfies ViewStyle,
    cabecalhoDaPagina: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space[3],
    } satisfies ViewStyle,
    titulos: { flexShrink: 1, flexGrow: 1, gap: space[1] } satisfies ViewStyle,
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] } satisfies ViewStyle,
  } as const;
}

/**
 * Casca de toda tela (AppPageTemplate): cabeçalho, um `<main id="conteudo">` com `h1` + descrição e,
 * logado, a barra de abas. O `h1` e a descrição não dependem de dados nem de JavaScript: estão no HTML
 * estático e são o LCP. `<title>` e `meta description` saem daqui, por rota (ADR 0002).
 * Ao entrar na tela por navegação no cliente, o foco vai ao `h1`; na carga inicial, não.
 */
export function TemplateTela({
  titulo,
  descricao,
  cabecalho,
  acoes,
  abas,
  children,
}: PropsTemplateTela) {
  const estilos = useEstilos(criarEstilos);
  const refTitulo = useRef<TextoRN>(null);
  useFocoNoTitulo(refTitulo);

  const topo = (
    <>
      {cabecalho}
      <View role="main" nativeID={ID_CONTEUDO} tabIndex={-1} style={estilos.principal}>
        <View style={estilos.miolo}>
          <View style={estilos.cabecalhoDaPagina}>
            <View style={estilos.titulos}>
              <Titulo nivel={1} ref={refTitulo} tabIndex={-1}>
                {titulo}
              </Titulo>
              <Texto cor="secundario">{descricao}</Texto>
            </View>
            {acoes ? <View style={estilos.acoes}>{acoes}</View> : null}
          </View>
          {children}
        </View>
      </View>
    </>
  );
  const barra = abas ? <BarraAbas itens={abas} /> : null;

  return (
    <View style={estilos.raiz}>
      <Head>
        <title>{`${titulo} · Backhaul`}</title>
        <meta name="description" content={descricao} />
      </Head>
      {Platform.OS === 'web' ? (
        <>
          {topo}
          {barra}
        </>
      ) : (
        <>
          {/* iPhone: só o conteúdo rola; a barra de abas fica fixa embaixo. */}
          <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
            {topo}
          </ScrollView>
          {barra}
        </>
      )}
    </View>
  );
}
