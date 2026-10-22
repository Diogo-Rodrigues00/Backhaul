// Diálogo de proposta do motorista (card 025, MVP-13, D-PO-05, D-PO-08, D-PO-14): confirma o aceite
// do valor oferecido ou pede o valor da contraproposta única. Existe um só por tela; a tela entrega o
// pedido (carga e tipo) e faz o envio (ADR 0003: componentes não falam com a API). Carregado por
// React.lazy na primeira abertura (`FormularioProposta.carregar.ts`), por isso fica fora do JS
// inicial da rota (ADR 0011).
import { useRef, useState, type RefObject } from 'react';
import type { TextInput } from 'react-native';

import { CampoNumero } from '@/components/molecules/CampoNumero';
import { moverFoco } from '@/lib/a11y';
import {
  AVISO_CONTRAPROPOSTA_UNICA,
  validarValorProposto,
  valorPropostoComoNumero,
} from '@/lib/fazerProposta';
import { formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import type { TipoPropostaEnviada } from '@/lib/propostasEnviadas';

import { DialogoConfirmacao } from './DialogoConfirmacao';

/** A carga e o tipo de proposta que o motorista pediu para enviar. */
export interface PedidoProposta {
  cargaId: string;
  tipo: TipoPropostaEnviada;
  /** "Grãos, Uberlândia - MG → Uberaba - MG". */
  descricaoDaCarga: string;
  empresa: string;
  valorOferecido: NumeroEntrada;
}

export interface PropsFormularioProposta {
  /** Último pedido; fica preenchido depois de fechar para o texto não mudar durante a saída. */
  pedido: PedidoProposta | null;
  aberto: boolean;
  /** Enviando: o botão de confirmar mostra o progresso e ignora toques. */
  enviando: boolean;
  /** Falha que se resolve tentando de novo (400, 5xx, rede): aparece dentro do diálogo. */
  erro?: string;
  /**
   * Confirmou. Na contraproposta recebe o valor já validado, como número; no aceite, nenhum valor.
   * A tela envia, fecha o diálogo no sucesso e deixa aberto em caso de `erro`.
   */
  aoEnviar: (valor?: number) => void | Promise<unknown>;
  /** Cancelar, Esc ou toque fora. */
  aoFechar: () => void;
  /** Elemento que recebe o foco ao fechar. */
  refRetorno: RefObject<unknown>;
}

function textosDoDialogo(pedido: PedidoProposta | null) {
  if (pedido === null) return { titulo: '', descricao: '', rotuloConfirmar: '' };
  const oferta = formatarMoeda(pedido.valorOferecido);
  if (pedido.tipo === 'aceite') {
    return {
      titulo: 'Aceitar o valor oferecido?',
      descricao: `Você faz o frete ${pedido.descricaoDaCarga} por ${oferta}. A empresa ${pedido.empresa} decide se fecha com você.`,
      rotuloConfirmar: `Aceitar ${oferta}`,
    };
  }
  return {
    titulo: 'Enviar contraproposta?',
    descricao: `${AVISO_CONTRAPROPOSTA_UNICA} Depois de enviada, não dá para mudar o valor. Carga: ${pedido.descricaoDaCarga}, oferecida por ${oferta}.`,
    rotuloConfirmar: 'Enviar contraproposta',
  };
}

export function FormularioProposta({
  pedido,
  aberto,
  enviando,
  erro,
  aoEnviar,
  aoFechar,
  refRetorno,
}: PropsFormularioProposta) {
  const campo = useRef<TextInput>(null);
  const [valor, setValor] = useState('');
  const [erroDoCampo, setErroDoCampo] = useState<string | undefined>();
  // Cada abertura começa limpa, sem o valor nem o erro da vez anterior. Ajuste de estado durante a
  // renderização (https://react.dev/learn/you-might-not-need-an-effect), não em efeito.
  const [estavaAberto, setEstavaAberto] = useState(aberto);
  if (aberto !== estavaAberto) {
    setEstavaAberto(aberto);
    if (aberto) {
      setValor('');
      setErroDoCampo(undefined);
    }
  }

  const contraproposta = pedido?.tipo === 'contraproposta';
  const textos = textosDoDialogo(pedido);

  const confirmar = () => {
    if (!contraproposta) return aoEnviar();
    const validacao = validarValorProposto(valor);
    const numero = valorPropostoComoNumero(valor);
    if (validacao !== true || numero === null) {
      setErroDoCampo(validacao === true ? 'Informe um número maior que zero.' : validacao);
      moverFoco(campo);
      return;
    }
    return aoEnviar(numero);
  };

  return (
    <DialogoConfirmacao
      aberto={aberto}
      titulo={textos.titulo}
      descricao={textos.descricao}
      rotuloConfirmar={textos.rotuloConfirmar}
      rotuloCarregando="Enviando…"
      carregando={enviando}
      erro={erro}
      aoConfirmar={confirmar}
      aoFechar={aoFechar}
      refRetorno={refRetorno}
      refFocoInicial={contraproposta ? campo : undefined}
    >
      {contraproposta ? (
        <CampoNumero
          ref={campo}
          rotulo="Valor proposto (R$)"
          ajuda={AVISO_CONTRAPROPOSTA_UNICA}
          prefixo="R$"
          value={valor}
          onChangeText={(texto) => {
            setValor(texto);
            if (erroDoCampo !== undefined) setErroDoCampo(undefined);
          }}
          erro={erroDoCampo}
          desabilitado={enviando}
          placeholder="0,00"
          returnKeyType="done"
          autoComplete="off"
        />
      ) : null}
    </DialogoConfirmacao>
  );
}
