// Ações de proposta de um cartão de "Cargas próximas" (card 025, MVP-13): "Aceitar R$ X" e
// "Contraproposta". Só mostra os botões e entrega o toque; o diálogo, o envio e os erros ficam em
// `FormularioProposta`, que é único na tela. Entra no cartão pela prop `acoes`.
import { useRef } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Banner } from '@/components/molecules/Banner';
import type { NumeroEntrada } from '@/lib/formatacao';
import { rotuloAceitar } from '@/lib/fazerProposta';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

/** Falha que a API explicou (409 de contraproposta, 403, 404): fica no cartão, junto dos botões. */
export interface AvisoDaProposta {
  mensagem: string;
  /** 404 da disponibilidade: leva a "Minhas disponibilidades". */
  linkDisponibilidades?: boolean;
}

export interface PropsAcoesProposta {
  /** "Grãos, Uberlândia - MG → Uberaba - MG": entra no nome acessível dos botões. */
  descricaoDaCarga: string;
  valorOferecido: NumeroEntrada;
  /** `false` depois de uma contraproposta (qualquer status) para a carga (D-PO-05). */
  contrapropostaDisponivel: boolean;
  aviso?: AvisoDaProposta;
  /** Recebem o botão que abriu o diálogo: o foco volta a ele ao cancelar. */
  aoAceitar: (origem: View | null) => void;
  aoContrapropor: (origem: View | null) => void;
}

export const TEXTO_CONTRAPROPOSTA = 'Contraproposta';
export const DICA_CONTRAPROPOSTA_UNICA = 'Só uma contraproposta por carga.';

function criarEstilos({ space }: TemaVisual) {
  return {
    raiz: { flexBasis: '100%', flexGrow: 1, gap: space[3] } satisfies ViewStyle,
    botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] } satisfies ViewStyle,
  } as const;
}

/**
 * Os dois botões de proposta. O nome acessível de cada um diz a carga ("Contraproposta para Grãos,
 * Uberlândia - MG → Uberaba - MG"); o texto visível é o começo desse nome (WCAG 2.5.3). O aviso de
 * que a contraproposta é única aparece aqui, antes do envio, e de novo no diálogo.
 */
export function AcoesProposta({
  descricaoDaCarga,
  valorOferecido,
  contrapropostaDisponivel,
  aviso,
  aoAceitar,
  aoContrapropor,
}: PropsAcoesProposta) {
  const estilos = useEstilos(criarEstilos);
  const textoAceitar = rotuloAceitar(valorOferecido);
  const refAceitar = useRef<View>(null);
  const refContrapropor = useRef<View>(null);

  return (
    <View style={estilos.raiz}>
      {aviso ? (
        <Banner
          variante="aviso"
          acao={
            aviso.linkDisponibilidades ? (
              <Link href="/motorista/disponibilidades">Minhas disponibilidades</Link>
            ) : undefined
          }
        >
          {aviso.mensagem}
        </Banner>
      ) : null}
      <View style={estilos.botoes}>
        <Botao
          ref={refAceitar}
          tamanho="lg"
          aria-label={`${textoAceitar} pela carga ${descricaoDaCarga}`}
          aoPressionar={() => aoAceitar(refAceitar.current)}
        >
          {textoAceitar}
        </Botao>
        {contrapropostaDisponivel ? (
          <Botao
            ref={refContrapropor}
            variante="secundario"
            tamanho="lg"
            aria-label={`${TEXTO_CONTRAPROPOSTA} para ${descricaoDaCarga}`}
            aoPressionar={() => aoContrapropor(refContrapropor.current)}
          >
            {TEXTO_CONTRAPROPOSTA}
          </Botao>
        ) : null}
      </View>
      {contrapropostaDisponivel ? (
        <Texto nivel="sm" cor="secundario">
          {DICA_CONTRAPROPOSTA_UNICA}
        </Texto>
      ) : null}
    </View>
  );
}
