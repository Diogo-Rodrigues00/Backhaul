// Resumo do frete (ResumoFrete, DS 5.2): tipo, valor final, andamento, datas e pagamento.
// Comissão não aparece aqui: ela é de outra tela (card 028) e vem sempre da API.
import { View } from 'react-native';

import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import { Preco } from '@/components/atoms/Preco';
import { Texto } from '@/components/atoms/Texto';
import { formatarDataHora, type NumeroEntrada } from '@/lib/formatacao';
import { rotuloPagamento, type StatusEntrega, type StatusPagamento } from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { AndamentoFrete } from './AndamentoFrete';
import { ListaDeFatos } from './ListaDeFatos';

export interface PropsResumoFrete {
  tipoCarga: string;
  valorFinal: NumeroEntrada;
  statusEntrega: StatusEntrega;
  /** ISO ou `null` até o frete ir para em trânsito. */
  coletaEm: string | null;
  /** ISO ou `null` até o frete ser entregue. */
  entregaEm: string | null;
  /** `null` = ainda não pago (D-PO-07). */
  statusPagamento: StatusPagamento | null;
}

// D-PO-07: `null` ("Aguardando pagamento") usa a variante neutra; o resto segue o sentido do valor.
const VARIANTE_PAGAMENTO: Record<StatusPagamento | 'nulo', VarianteEtiqueta> = {
  nulo: 'neutro',
  pendente: 'neutro',
  retido: 'info',
  liberado: 'ok',
  estornado: 'erro',
};

function criarEstilos({ space: espaco }: TemaVisual) {
  return { bloco: { gap: espaco[4] } } as const;
}

/** Frete de uma das partes: valor, andamento, datas e situação do pagamento. */
export function ResumoFrete({
  tipoCarga,
  valorFinal,
  statusEntrega,
  coletaEm,
  entregaEm,
  statusPagamento,
}: PropsResumoFrete) {
  const estilos = useEstilos(criarEstilos);
  const variante = VARIANTE_PAGAMENTO[statusPagamento ?? 'nulo'];

  return (
    <View style={estilos.bloco}>
      <Texto nivel="lg">{tipoCarga}</Texto>
      <Preco valor={valorFinal} rotulo="Valor do frete" />
      <AndamentoFrete statusEntrega={statusEntrega} />
      <ListaDeFatos
        itens={[
          { rotulo: 'Coletada em', valor: formatarDataHora(coletaEm) },
          { rotulo: 'Entregue em', valor: formatarDataHora(entregaEm) },
          {
            rotulo: 'Pagamento',
            valor: <Etiqueta variante={variante}>{rotuloPagamento(statusPagamento)}</Etiqueta>,
          },
        ]}
      />
    </View>
  );
}
