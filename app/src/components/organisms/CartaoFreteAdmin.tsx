// Cartão de frete do admin (card 041): só leitura. O tipo da carga é o `h3`; empresa, motorista,
// placa, valor, entrega, pagamento, comissão e data vão numa lista de termos e definições. Pagamento
// e comissão `null` (a empresa ainda não pagou) viram texto, não travessão. Valores como a API devolveu.
import { useId } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Titulo } from '@/components/atoms/Titulo';
import { ListaDeFatos, type ItemDeFato } from '@/components/molecules/ListaDeFatos';
import { formatarDataHora, formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import { QUEBRA_ONDE_PRECISAR } from '@/lib/quebraDeTexto';
import {
  rotuloPagamento,
  rotuloStatusEntrega,
  type StatusEntrega,
  type StatusPagamento,
} from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export const TEXTO_NAO_PAGO = 'Não pago';
export const TEXTO_COMISSAO_PENDENTE = 'Ainda não calculada';

export interface PropsCartaoFreteAdmin {
  tipoCarga: string;
  empresa: string;
  motorista: string;
  placa: string;
  valorFinal: NumeroEntrada;
  statusEntrega: StatusEntrega;
  /** `null` = a empresa ainda não pagou. */
  statusPagamento: StatusPagamento | null;
  /** `null` enquanto a empresa não pagou. */
  valorComissao: NumeroEntrada;
  criadoEm: string;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
  } as const;
}

/** Frete na lista do admin: `article` com o tipo da carga em `h3` e os fatos em `<dl>`. */
export function CartaoFreteAdmin({
  tipoCarga,
  empresa,
  motorista,
  placa,
  valorFinal,
  statusEntrega,
  statusPagamento,
  valorComissao,
  criadoEm,
}: PropsCartaoFreteAdmin) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-frete-admin`;
  const itens: readonly ItemDeFato[] = [
    { rotulo: 'Empresa', valor: empresa },
    { rotulo: 'Motorista', valor: motorista },
    { rotulo: 'Placa', valor: placa },
    { rotulo: 'Valor do frete', valor: formatarMoeda(valorFinal) },
    { rotulo: 'Entrega', valor: rotuloStatusEntrega(statusEntrega) },
    {
      rotulo: 'Pagamento',
      valor: statusPagamento === null ? TEXTO_NAO_PAGO : rotuloPagamento(statusPagamento),
    },
    {
      rotulo: 'Comissão',
      valor:
        valorComissao === null || valorComissao === undefined
          ? TEXTO_COMISSAO_PENDENTE
          : formatarMoeda(valorComissao),
    },
    { rotulo: 'Criado em', valor: formatarDataHora(criadoEm) },
  ];

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <Titulo nivel={3} nativeID={idTitulo} style={QUEBRA_ONDE_PRECISAR}>
        {tipoCarga}
      </Titulo>
      <ListaDeFatos itens={itens} />
    </View>
  );
}
