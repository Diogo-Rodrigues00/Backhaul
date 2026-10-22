import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

import { useEnvioUnico } from '@/components/molecules/formulario';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoFormulario {
  /** Nome acessível do formulário ("Cadastro de motorista"): é o `aria-label` do `role="form"`. */
  nome: string;
  /** O `ResumoErros` (ou outro aviso), no topo do cartão. */
  resumo?: ReactNode;
  /** Os campos, cada um dentro de uma `CelulaFormulario`. */
  children: ReactNode;
  /** Botões do rodapé, alinhados à direita (o principal por último). */
  acoes: ReactNode;
  /**
   * Chamado quando o navegador tenta enviar o formulário (Enter num campo de texto, na web), no máximo
   * um por vez. O envio padrão do navegador, que recarregaria a página, é sempre cancelado.
   */
  aoEnviar?: () => void | Promise<unknown>;
}

export interface PropsCelulaFormulario {
  /** Ocupa a largura toda do cartão, em vez de meia coluna. */
  cheia?: boolean;
  children: ReactNode;
}

// Largura abaixo da qual as colunas empilham, sem JavaScript: duas células de 304 px mais o espaço
// entre elas só cabem num cartão de página acima de ~720 px (DS 5.3: 1 coluna até 720 px).
const LARGURA_BASE_CELULA = 304;

function criarEstilos({ border, radius, space, sombra }: TemaVisual) {
  return {
    cartao: {
      width: '100%',
      gap: space[5],
      padding: space[6],
      borderWidth: border.width,
      borderRadius: radius.lg,
      ...sombra.card,
    } satisfies ViewStyle,
    grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[5] } satisfies ViewStyle,
    celula: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: LARGURA_BASE_CELULA,
      minWidth: 0,
    } satisfies ViewStyle,
    celulaCheia: { flexBasis: '100%' } satisfies ViewStyle,
    rodape: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: space[3],
      paddingTop: space[5],
      borderTopWidth: border.width,
    } satisfies ViewStyle,
  } as const;
}

/** Célula da grade do `CartaoFormulario`: meia coluna, ou a largura toda com `cheia`. */
export function CelulaFormulario({ cheia = false, children }: PropsCelulaFormulario) {
  const estilos = useEstilos(criarEstilos);
  return <View style={[estilos.celula, cheia && estilos.celulaCheia]}>{children}</View>;
}

/**
 * Cartão de formulário (FormCard, DS 5.3): `role="form"` com nome, resumo de erros no topo, grade de
 * 2 colunas que vira 1 coluna em tela estreita (por `flex-wrap`, sem JavaScript nem medir a tela),
 * e rodapé de ações à direita. Na web é um `<form>`; o envio padrão do navegador é cancelado.
 * O componente não conhece a API: o formulário recebe `onSubmit` da tela (ADR 0003).
 */
export function CartaoFormulario({
  nome,
  resumo,
  children,
  acoes,
  aoEnviar,
}: PropsCartaoFormulario) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const raiz = useRef<View>(null);
  // Um envio de cada vez: Enter repetido enquanto o anterior não terminou não envia de novo.
  const enviarUnico = useEnvioUnico(() => aoEnviar?.());

  // Na web o botão é um Pressable (sem type=submit), então o <form> só envia sozinho com um campo; e
  // aí recarregaria a página. Aqui o Enter num campo de texto envia (com qualquer número de campos) e
  // o envio padrão do navegador é sempre cancelado.
  useEffect(() => {
    const no = raiz.current as unknown as HTMLFormElement | null;
    if (Platform.OS !== 'web' || !no?.addEventListener) return;
    const aoSubmeter = (evento: Event) => {
      evento.preventDefault();
      void enviarUnico();
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (evento.key !== 'Enter' || evento.isComposing || evento.defaultPrevented) return;
      if (alvo?.tagName !== 'INPUT') return;
      evento.preventDefault();
      void enviarUnico();
    };
    no.addEventListener('submit', aoSubmeter);
    no.addEventListener('keydown', aoTeclar);
    return () => {
      no.removeEventListener('submit', aoSubmeter);
      no.removeEventListener('keydown', aoTeclar);
    };
  }, [enviarUnico]);

  return (
    <View
      ref={raiz}
      role="form"
      aria-label={nome}
      accessibilityLabel={nome}
      style={[
        estilos.cartao,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      {resumo}
      <View style={estilos.grade}>{children}</View>
      <View style={[estilos.rodape, { borderTopColor: colors.border.subtle }]}>{acoes}</View>
    </View>
  );
}
