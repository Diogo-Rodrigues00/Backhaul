import { useCallback, useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { Modal, Platform, ScrollView, View, type ViewProps } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { moverFoco } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { Botao } from '../atoms/Botao';
import { Texto } from '../atoms/Texto';
import { Titulo } from '../atoms/Titulo';

export interface PropsDialogoConfirmacao {
  aberto: boolean;
  titulo: string;
  /** Frase que diz o que vai acontecer ("Aceitar a proposta de João da Silva?"). */
  descricao: string;
  /** Conteúdo extra entre a descrição e os botões (campo de contraproposta, resumo do pagamento). */
  children?: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  /** Rótulo do botão de confirmar enquanto `carregando` ("Enviando…"). */
  rotuloCarregando?: string;
  /** `perigo` usa o token de perigo; o texto do botão continua explícito. */
  variante?: 'padrao' | 'perigo';
  /** Enviando: confirmar mostra o progresso e ignora toques; cancelar e Esc ficam travados. */
  carregando?: boolean;
  /** Falha do envio: aparece dentro do diálogo (`role="alert"`) e o diálogo continua aberto. */
  erro?: string;
  aoConfirmar: () => void | Promise<unknown>;
  aoFechar: () => void;
  /**
   * Elemento que abriu o diálogo; recebe o foco ao fechar. No iPhone é o caminho para devolver o
   * foco do VoiceOver. Na web, sem ele, volta ao elemento que tinha o foco ao abrir.
   */
  refRetorno?: RefObject<unknown>;
}

// Véu do protótipo (--backdrop): `bg.inverse` (asfalto) a 62%, numa camada à
// parte para a opacidade não atingir o diálogo. Ainda não é papel do DS.
const OPACIDADE_VEU = 0.62;
const LARGURA_MAXIMA = 500;
// Largura mínima de cada botão do rodapé: abaixo disso eles empilham (320 px).
const LARGURA_BOTAO = 140;

function criarEstilos({ border, colors, radius, sombra, space }: TemaVisual) {
  return {
    veu: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[4],
    },
    camadaVeu: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.bg.inverse,
      opacity: OPACIDADE_VEU,
    },
    caixa: {
      width: '100%',
      maxWidth: LARGURA_MAXIMA,
      maxHeight: '100%',
      backgroundColor: colors.bg.surface,
      borderWidth: border.widthStrong,
      borderColor: colors.border.strong,
      borderRadius: radius.lg,
      ...sombra.dialog,
    },
    rolagem: { flexShrink: 1 },
    corpo: { padding: space[5], gap: space[3] },
    erro: {
      padding: space[3],
      borderWidth: border.width,
      borderColor: colors.error.border,
      borderRadius: radius.md,
      backgroundColor: colors.error.bg,
    },
    rodape: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: space[3],
      padding: space[5],
      borderTopWidth: border.width,
      borderTopColor: colors.border.subtle,
    },
    botao: { flexGrow: 1, flexBasis: LARGURA_BOTAO },
  } as const;
}

// A web é a única plataforma em que o foco inicial vai ao botão Cancelar (o `Botao` não repassa
// `ref`; o elemento do DOM é achado a partir de um `View` em volta dele).
function focarBotaoWeb(envoltorio: RefObject<View | null>) {
  const no = envoltorio.current as unknown as ParentNode | null;
  const botao = no?.querySelector?.<HTMLElement>('[role="button"], button');
  botao?.focus();
}

/**
 * Diálogo de confirmação (ConfirmDialog do DS) para ações sem volta: aceitar, recusar, pagar,
 * avançar frete, enviar contraproposta. `Modal` do React Native, sem biblioteca externa.
 *
 * Web: o `Modal` do react-native-web prende o Tab no diálogo; o foco inicial vai ao Cancelar, Esc
 * fecha e o foco volta a quem abriu. iPhone: `accessibilityViewIsModal` mantém o VoiceOver dentro
 * do diálogo e o foco inicial vai ao título (o VoiceOver lê título e frase antes dos botões).
 */
export function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  children,
  rotuloConfirmar,
  rotuloCancelar = 'Cancelar',
  rotuloCarregando = 'Enviando…',
  variante = 'padrao',
  carregando = false,
  erro,
  aoConfirmar,
  aoFechar,
  refRetorno,
}: PropsDialogoConfirmacao) {
  const estilos = useEstilos(criarEstilos);
  const reduzido = useMovimentoReduzido();
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idDescricao = `${id}-descricao`;

  const refCancelar = useRef<View>(null);
  const refTitulo = useRef<View>(null);
  const estavaAberto = useRef(false);
  const origemWeb = useRef<HTMLElement | null>(null);

  // Guarda quem tinha o foco ao abrir e o devolve ao fechar. Roda antes de o `Modal` existir no DOM,
  // então `activeElement` ainda é o botão que abriu.
  useEffect(() => {
    if (aberto && !estavaAberto.current) {
      estavaAberto.current = true;
      origemWeb.current =
        Platform.OS === 'web' ? (document.activeElement as HTMLElement | null) : null;
      return;
    }
    if (!aberto && estavaAberto.current) {
      estavaAberto.current = false;
      const origem = origemWeb.current;
      origemWeb.current = null;
      // Depois do desmonte do Modal, que também mexe no foco.
      const tempo = setTimeout(() => {
        if (refRetorno?.current) moverFoco(refRetorno);
        else if (origem?.isConnected) origem.focus();
      }, 0);
      return () => clearTimeout(tempo);
    }
  }, [aberto, refRetorno]);

  const aoMostrar = useCallback(() => {
    if (Platform.OS === 'web') focarBotaoWeb(refCancelar);
    else moverFoco(refTitulo);
  }, []);

  // Esc e o gesto de voltar fecham, menos durante o envio (senão burlariam o botão travado).
  const pedirFechamento = useCallback(() => {
    if (!carregando) aoFechar();
  }, [carregando, aoFechar]);

  // O `Modal` do react-native-web põe `role="dialog"` na própria caixa; sem nome, o axe reprova.
  // Os dois ids apontam para o mesmo título e a mesma frase.
  const nomeDoModal = {
    'aria-labelledby': idTitulo,
    'aria-describedby': idDescricao,
  } as ViewProps;

  return (
    <Modal
      transparent
      visible={aberto}
      animationType={reduzido ? 'none' : 'fade'}
      onRequestClose={pedirFechamento}
      onShow={aoMostrar}
      {...nomeDoModal}
    >
      <View style={estilos.veu}>
        <View style={estilos.camadaVeu} />
        <View
          role="alertdialog"
          aria-modal
          accessibilityViewIsModal
          aria-labelledby={idTitulo}
          aria-describedby={idDescricao}
          style={estilos.caixa}
        >
          <ScrollView
            style={estilos.rolagem}
            contentContainerStyle={estilos.corpo}
            // Web: conteúdo longo rola dentro do diálogo e o teclado precisa alcançar a rolagem.
            tabIndex={Platform.OS === 'web' ? 0 : undefined}
          >
            <View ref={refTitulo} accessible={Platform.OS !== 'web'}>
              <Titulo nivel={2} nativeID={idTitulo}>
                {titulo}
              </Titulo>
            </View>
            <Texto cor="secundario" nativeID={idDescricao}>
              {descricao}
            </Texto>
            {children}
            {erro ? (
              <View role="alert" style={estilos.erro}>
                <Texto cor="erro" peso="bold">
                  {erro}
                </Texto>
              </View>
            ) : null}
          </ScrollView>
          <View style={estilos.rodape}>
            <View ref={refCancelar} style={estilos.botao}>
              <Botao variante="secundario" bloco desabilitado={carregando} aoPressionar={aoFechar}>
                {rotuloCancelar}
              </Botao>
            </View>
            <View style={estilos.botao}>
              <Botao
                variante={variante === 'perigo' ? 'perigo' : 'primario'}
                bloco
                carregando={carregando}
                rotuloCarregando={rotuloCarregando}
                aoPressionar={aoConfirmar}
              >
                {rotuloConfirmar}
              </Botao>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
