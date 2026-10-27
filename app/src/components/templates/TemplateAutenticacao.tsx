import Head from 'expo-router/head';
import { useRef, type ReactNode } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { CorpoDaTela } from '@/components/molecules/CorpoDaTela';
import { ID_CONTEUDO } from '@/components/molecules/PularParaConteudo';
import { Cabecalho } from '@/components/organisms/Cabecalho';
import { PainelMarca } from '@/components/organisms/PainelMarca';
import { useFocoNoTitulo } from '@/hooks/useFocoNoTitulo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export interface PropsTemplateAutenticacao {
  /** O `h1` e o `<title>` da rota ("Entrar"). Único por rota. */
  titulo: string;
  /** Uma frase sob o título e a `meta description`. Também no HTML estático (LCP, ADR 0011). */
  descricao: string;
  /** Aviso no topo do cartão, acima do título (sessão expirada etc.). */
  aviso?: ReactNode;
  /** O formulário e o que vem depois dele dentro do cartão. */
  children?: ReactNode;
}

const LARGURA_CARTAO = 460;

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    raiz: { flex: 1, backgroundColor: colors.bg.page } satisfies ViewStyle,
    // `flex-wrap` em vez de media query: o painel e o cartão pedem 450 px cada um, então abaixo de
    // ~900 px o cartão desce para baixo do painel, sem JavaScript nem medir a tela.
    principal: {
      flex: 1,
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'stretch',
    } satisfies ViewStyle,
    painel: {
      flexGrow: 6,
      flexShrink: 1,
      flexBasis: 450,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[8],
      paddingHorizontal: space[4],
    } satisfies ViewStyle,
    cartao: { width: '100%', maxWidth: LARGURA_CARTAO, gap: space[5] } satisfies ViewStyle,
    titulos: { gap: space[1] } satisfies ViewStyle,
  } as const;
}

/**
 * Página de autenticação (AuthTemplate, DS 5.4): cabeçalho simples e, lado a lado, o `PainelMarca`
 * (decorativo) e o cartão do formulário; abaixo de ~900 px o cartão fica embaixo do painel. Tem a
 * mesma estrutura do `TemplateFormulario` (landmarks `banner` e `main#conteudo`, um `h1` com foco ao
 * navegar, `<title>` e `meta description` por rota), mas é uma casca própria para não crescer o
 * JS inicial das demais telas. O `h1` e a descrição ficam no HTML estático (LCP).
 */
export function TemplateAutenticacao({
  titulo,
  descricao,
  aviso,
  children,
}: PropsTemplateAutenticacao) {
  const estilos = useEstilos(criarEstilos);
  const refTitulo = useRef<TextoRN>(null);
  useFocoNoTitulo(refTitulo);

  return (
    <View style={estilos.raiz}>
      <Head>
        <title>{`${titulo} · Backhaul`}</title>
        <meta name="description" content={descricao} />
      </Head>
      <CorpoDaTela barra={null}>
        <Cabecalho variante="simples" />
        <View role="main" nativeID={ID_CONTEUDO} tabIndex={-1} style={estilos.principal}>
          <PainelMarca />
          <View style={estilos.painel}>
            <View style={estilos.cartao}>
              {aviso}
              <View style={estilos.titulos}>
                <Titulo nivel={1} ref={refTitulo} tabIndex={-1}>
                  {titulo}
                </Titulo>
                <Texto cor="secundario">{descricao}</Texto>
              </View>
              {children}
            </View>
          </View>
        </View>
      </CorpoDaTela>
    </View>
  );
}
