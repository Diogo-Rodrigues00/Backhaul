import Head from 'expo-router/head';
import { useEffect, useRef, type ReactNode } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { CorpoDaTela } from '@/components/molecules/CorpoDaTela';
import { ID_CONTEUDO } from '@/components/molecules/PularParaConteudo';
import { moverFoco } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export interface PropsTemplateCentralizado {
  /** O `h1` e o `<title>` da tela. */
  titulo: string;
  /** Uma frase sob o título e a `meta description`. */
  descricao: string;
  /**
   * `true` quando a frase é o aviso de um erro: ganha `role="alert"` e o leitor de tela a anuncia
   * na hora. Sem ele, só o título (que recebe o foco) fala.
   */
  descricaoComoAlerta?: boolean;
  /** O `<Cabecalho variante="simples">` da tela. */
  cabecalho: ReactNode;
  /** Ilustração decorativa acima do título (estrada, ícone). Já deve ser `aria-hidden`. */
  ilustracao?: ReactNode;
  /** Ações ou avisos abaixo da frase (botão, banner). */
  children?: ReactNode;
}

const LARGURA_COLUNA = 520;

function criarEstilos({ colors, space }: TemaVisual) {
  return {
    raiz: { flex: 1, backgroundColor: colors.bg.page } satisfies ViewStyle,
    principal: { flex: 1, width: '100%', justifyContent: 'center' } satisfies ViewStyle,
    coluna: {
      width: '100%',
      maxWidth: LARGURA_COLUNA,
      alignSelf: 'center',
      alignItems: 'center',
      paddingVertical: space[12],
      paddingHorizontal: space[6],
      gap: space[5],
    } satisfies ViewStyle,
    bloco: { width: '100%', alignItems: 'center', gap: space[3] } satisfies ViewStyle,
    texto: { textAlign: 'center' } as const,
  } as const;
}

/**
 * Casca das telas de uma só ideia (CenteredTemplate): cabeçalho simples e uma coluna central de até
 * 520 px com ilustração, `h1`, frase e uma ação. Ao aparecer, o foco vai ao `h1` (ADR 0009).
 */
export function TemplateCentralizado({
  titulo,
  descricao,
  descricaoComoAlerta = false,
  cabecalho,
  ilustracao,
  children,
}: PropsTemplateCentralizado) {
  const estilos = useEstilos(criarEstilos);
  const refTitulo = useRef<TextoRN>(null);

  useEffect(() => {
    moverFoco(refTitulo);
  }, []);

  return (
    <View style={estilos.raiz}>
      <Head>
        <title>{`${titulo} · Backhaul`}</title>
        <meta name="description" content={descricao} />
      </Head>
      <CorpoDaTela>
        {cabecalho}
        <View role="main" nativeID={ID_CONTEUDO} tabIndex={-1} style={estilos.principal}>
          <View style={estilos.coluna}>
            {ilustracao}
            <View style={estilos.bloco}>
              <Titulo nivel={1} ref={refTitulo} tabIndex={-1} style={estilos.texto}>
                {titulo}
              </Titulo>
              <Texto
                nivel="lg"
                cor="secundario"
                role={descricaoComoAlerta ? 'alert' : undefined}
                style={estilos.texto}
              >
                {descricao}
              </Texto>
            </View>
            {children}
          </View>
        </View>
      </CorpoDaTela>
    </View>
  );
}
