// Cartão de carga (ResumoCarga, DS 5.2 e 6): o mesmo conteúdo em todas as telas (empresa, motorista).
// Não busca dados nem calcula nada: recebe rótulos prontos e valores como a API devolveu.
import { View } from 'react-native';

import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import { MarcadorKm } from '@/components/atoms/MarcadorKm';
import { Preco } from '@/components/atoms/Preco';
import { SeloUrgencia } from '@/components/atoms/SeloUrgencia';
import { Texto } from '@/components/atoms/Texto';
import { formatarDataHora, formatarPeso, type NumeroEntrada } from '@/lib/formatacao';
import { rotuloStatusCarga, type StatusCarga, type Urgencia } from '@/lib/rotulos';
import { statusEfetivo } from '@/lib/vencimento';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { LinhaRota } from './LinhaRota';
import { ListaDeFatos, type ItemDeFato } from './ListaDeFatos';

export interface PropsResumoCarga {
  tipoCarga: string;
  /** Razão social da empresa, quando a tela mostra carga de outra parte (motorista). */
  empresa?: string;
  /** Rótulo pronto do local de coleta (`rotuloDoLocal`). */
  origem: string;
  /** Rótulo pronto do local de entrega (`rotuloDoLocal`). */
  destino: string;
  pesoKg?: NumeroEntrada;
  valorOferecido: NumeroEntrada;
  urgencia: Urgencia;
  /** Nome da certificação exigida; `null` quando não há exigência. */
  certificacao: string | null;
  expiraEm: string;
  /**
   * Status da carga na API. Sem ele, o prazo é conferido como `aberto` (cargas próximas só trazem
   * cargas abertas) e a etiqueta de status só aparece quando o prazo já venceu.
   */
  status?: StatusCarga;
  distanciaKm?: NumeroEntrada;
  /** Relógio para o status efetivo (CT-10). Padrão: agora. Injetável para teste. */
  agora?: Date;
}

// Etiqueta de status: sempre ícone + texto (ver Etiqueta). `expirado` usa a borda tracejada (DS 5.1).
const VARIANTE_STATUS: Record<StatusCarga, VarianteEtiqueta> = {
  aberto: 'ok',
  em_negociacao: 'info',
  fechado: 'neutro',
  cancelado: 'erro',
  expirado: 'tracejada',
};

function criarEstilos({ space: espaco }: TemaVisual) {
  return {
    cartao: { gap: espaco[3] },
    topo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espaco[2] },
  } as const;
}

/** Resumo de uma carga: selo de urgência, status, rota, valor, fatos e distância. */
export function ResumoCarga({
  tipoCarga,
  empresa,
  origem,
  destino,
  pesoKg,
  valorOferecido,
  urgencia,
  certificacao,
  expiraEm,
  status,
  distanciaKm,
  agora,
}: PropsResumoCarga) {
  const estilos = useEstilos(criarEstilos);
  const efetivo = statusEfetivo(status ?? 'aberto', expiraEm, agora);
  const expirado = efetivo === 'expirado';
  const mostrarStatus = status !== undefined || expirado;

  const itens: ItemDeFato[] = [];
  if (empresa) itens.push({ rotulo: 'Empresa', valor: empresa });
  if (pesoKg !== undefined && pesoKg !== null) {
    itens.push({ rotulo: 'Peso', valor: formatarPeso(pesoKg) });
  }
  itens.push({
    rotulo: 'Certificação',
    valor:
      certificacao === null ? (
        'Sem exigência'
      ) : (
        <Etiqueta variante="info">{`Exige ${certificacao}`}</Etiqueta>
      ),
  });
  itens.push({
    rotulo: expirado ? 'Prazo vencido em' : 'Expira em',
    valor: formatarDataHora(expiraEm),
  });

  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <SeloUrgencia urgencia={urgencia} tamanho="lg" />
        {mostrarStatus ? (
          <Etiqueta variante={VARIANTE_STATUS[efetivo]}>{rotuloStatusCarga(efetivo)}</Etiqueta>
        ) : null}
      </View>
      <Texto nivel="lg">{tipoCarga}</Texto>
      <LinhaRota origem={origem} destino={destino} />
      <Preco valor={valorOferecido} rotulo="Valor oferecido" expirado={expirado} />
      <ListaDeFatos itens={itens} />
      <MarcadorKm km={distanciaKm ?? null} />
    </View>
  );
}
