import { usePathname } from 'expo-router';
import { View, type ViewStyle } from 'react-native';

import { DivisorEstrada } from '@/components/atoms/DivisorEstrada';
import { Logo } from '@/components/atoms/Logo';
import { Texto } from '@/components/atoms/Texto';
import { AbaNavegacao, type ItemNavegacao } from '@/components/molecules/AbaNavegacao';
import { AlternarTema } from '@/components/molecules/AlternarTema';
import { AreaSegura } from '@/components/molecules/AreaSegura';
import { BotaoCabecalho } from '@/components/molecules/BotaoCabecalho';
import { PularParaConteudo } from '@/components/molecules/PularParaConteudo';
import { Responsivo } from '@/components/molecules/Responsivo';
import { indiceDaPaginaAtual, type HrefSimples } from '@/lib/navegacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface UsuarioCabecalho {
  nome: string;
  /** Perfil já em texto de tela: "Empresa", "Motorista". */
  perfil: string;
}

export type PropsCabecalho =
  | {
      /** Telas públicas: logo e tema. */
      variante: 'simples';
    }
  | {
      /** Telas logadas: logo, navegação, quem está logado, tema e Sair. */
      variante: 'completo';
      /**
       * Destinos da área. Acima de 960 px a navegação está aqui; até 960 px só na `BarraAbas`, então a
       * tela precisa passar os MESMOS itens em `abas` do `TemplateTela` (use `useCasca()`). Lista vazia
       * (administrador) = sem navegação.
       */
      itens: readonly ItemNavegacao[];
      usuario: UsuarioCabecalho;
      aoSair: () => void;
    };

const LARGURA_MAXIMA = 1120;
const ALTURA_MINIMA = 68;

function criarEstilos({ space }: TemaVisual) {
  return {
    dentro: {
      width: '100%',
      maxWidth: LARGURA_MAXIMA,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: ALTURA_MINIMA,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
    } satisfies ViewStyle,
    navegacao: { flex: 1 } satisfies ViewStyle,
    lista: { flexDirection: 'row', alignItems: 'center', gap: space[1] } satisfies ViewStyle,
    usuario: { alignItems: 'flex-end', marginLeft: 'auto' } satisfies ViewStyle,
    direita: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      marginLeft: 'auto',
    } satisfies ViewStyle,
  } as const;
}

/**
 * Cabeçalho (AppHeader): fundo asfalto com a faixa tracejada âmbar na base. É o `banner` da tela.
 * "Pular para o conteúdo" é o primeiro foco. Acima de 960 px a navegação fica no cabeçalho; até
 * 960 px ela vai para a `BarraAbas` e sobram logo e ícones (nunca as duas visíveis).
 */
export function Cabecalho(props: PropsCabecalho) {
  const estilos = useEstilos(criarEstilos);
  const { colors, preferencia, alternar } = useTema();
  const pathname = usePathname();
  const itens = props.variante === 'completo' ? props.itens : [];
  const indiceAtual = indiceDaPaginaAtual(
    pathname,
    itens.map((item) => item.href as HrefSimples),
  );

  return (
    <AreaSegura
      lado="topo"
      role="banner"
      dataSet={{ anel: 'inverso' }}
      style={{ backgroundColor: colors.bg.inverse }}
    >
      <PularParaConteudo />
      <View style={estilos.dentro}>
        <Logo sobreInverso />
        {props.variante === 'completo' ? (
          <>
            {/* Sem itens (área do administrador) não há navegação: nada de landmark vazio. */}
            {itens.length > 0 ? (
              <Responsivo bp="sem-barra" style={estilos.navegacao}>
                <View role="navigation" aria-label="Principal">
                  <View role="list" style={estilos.lista}>
                    {itens.map((item, indice) => (
                      <View key={item.rotulo} role="listitem">
                        <AbaNavegacao
                          {...item}
                          variante="cabecalho"
                          atual={indice === indiceAtual}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </Responsivo>
            ) : null}
            <Responsivo bp="sem-largo" style={estilos.usuario}>
              {/* Nome vazio = sessão ainda sendo restaurada (HTML estático): só o perfil aparece. */}
              {props.usuario.nome !== '' ? (
                <Texto nivel="sm" peso="bold" cor="sobreInverso">
                  {props.usuario.nome}
                </Texto>
              ) : null}
              <Texto nivel="caption" cor="sobreInversoDiscreto">
                {props.usuario.perfil}
              </Texto>
            </Responsivo>
          </>
        ) : null}
        <View style={estilos.direita}>
          <AlternarTema preferencia={preferencia} aoAlternar={alternar} />
          {props.variante === 'completo' ? (
            <BotaoCabecalho
              icone="log-out"
              rotulo="Sair"
              texto="Sair"
              aoPressionar={props.aoSair}
            />
          ) : null}
        </View>
      </View>
      <DivisorEstrada variante="ambar" />
    </AreaSegura>
  );
}
