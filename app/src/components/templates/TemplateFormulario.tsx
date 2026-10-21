import type { Href } from 'expo-router';
import Head from 'expo-router/head';
import { useRef, type ReactNode } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { CorpoDaTela } from '@/components/molecules/CorpoDaTela';
import { ID_CONTEUDO } from '@/components/molecules/PularParaConteudo';
import { Cabecalho } from '@/components/organisms/Cabecalho';
import { useFocoNoTitulo } from '@/hooks/useFocoNoTitulo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export interface PropsTemplateFormulario {
  /** O `h1` e o `<title>` da rota ("Cadastro de motorista"). Único por rota. */
  titulo: string;
  /** Uma frase sob o título e a `meta description`. Também no HTML estático (LCP, ADR 0011). */
  descricao: string;
  /** Link para a tela anterior, acima do título ("Voltar ao login"). */
  voltar?: { href: Href; rotulo: string };
  /** O `CartaoFormulario`. */
  children?: ReactNode;
}

const LARGURA_MAXIMA = 760;

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    raiz: { flex: 1, backgroundColor: colors.bg.page } satisfies ViewStyle,
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
    titulos: { gap: space[1] } satisfies ViewStyle,
  } as const;
}

/**
 * Página de formulário das telas públicas (FormPageTemplate, DS 5.4): cabeçalho simples, página de
 * até 760 px, link "Voltar", `h1` com a descrição e o `CartaoFormulario`. Tem a mesma estrutura do
 * `TemplateTela` (landmarks `banner` e `main#conteudo`, um `h1` com foco ao navegar, `<title>` e
 * `meta description` por rota), mas é uma casca própria: assim o `TemplateTela`, que vai no JS
 * inicial de toda rota, não cresce com um caso que só os formulários usam.
 */
export function TemplateFormulario({
  titulo,
  descricao,
  voltar,
  children,
}: PropsTemplateFormulario) {
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
          <View style={estilos.miolo}>
            {voltar ? (
              <Link
                href={voltar.href}
                variante="botao"
                aparencia={{ variante: 'texto', icone: 'arrow-left' }}
              >
                {voltar.rotulo}
              </Link>
            ) : null}
            <View style={estilos.titulos}>
              <Titulo nivel={1} ref={refTitulo} tabIndex={-1}>
                {titulo}
              </Titulo>
              <Texto cor="secundario">{descricao}</Texto>
            </View>
            {children}
          </View>
        </View>
      </CorpoDaTela>
    </View>
  );
}
