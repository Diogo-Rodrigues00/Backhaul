// Cartão de disponibilidade do motorista (DS 5.2, protótipo "Minhas disponibilidades"): local, raio,
// urgência, prazo, status e propostas pendentes, com "Usar esta". Não busca dados: a tela entrega a
// disponibilidade pronta por props (ADR 0003).
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import { SeloUrgencia } from '@/components/atoms/SeloUrgencia';
import { Texto } from '@/components/atoms/Texto';
import { ListaDeFatos, type ItemDeFato } from '@/components/molecules/ListaDeFatos';
import { type Coordenada, rotuloDoLocal } from '@/lib/cidades';
import { formatarDataHora, SEM_VALOR, type NumeroEntrada } from '@/lib/formatacao';
import { paraNumero } from '@/lib/numeros';
import {
  rotuloStatusDisponibilidade,
  type StatusDisponibilidade,
  type Urgencia,
} from '@/lib/rotulos';
import { statusEfetivo } from '@/lib/vencimento';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoDisponibilidade {
  id: string;
  local: Coordenada;
  raioKm: NumeroEntrada;
  urgencia: Urgencia;
  status: StatusDisponibilidade;
  expiraEm: string;
  /** Só a lista da proposta 4b traz o número; sem ele (plano B) a linha não aparece. */
  propostasPendentes?: number;
  /** É a disponibilidade em uso: mostra "Ativa" em texto e não oferece "Usar esta". */
  ativa: boolean;
  /** "Usar esta": recebe o id. Sem ele, o botão não aparece. */
  aoUsar?: (id: string) => void;
  /** Relógio para o status efetivo (CT-10). Padrão: agora. Injetável para teste. */
  agora?: Date;
}

/** Texto do local quando o ponto não tem cidade na lista (coordenada fora do mapa). */
export const LOCAL_SEM_CIDADE = 'Local não identificado';

export function rotuloLocalDisponibilidade(local: Coordenada): string {
  const cidade = rotuloDoLocal(local);
  return cidade === null ? LOCAL_SEM_CIDADE : `Perto de ${cidade}`;
}

// Raio em km inteiro quando for inteiro ("80 km"); aceita meio quilômetro ("12,5 km").
const formatadorRaio = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function rotuloRaio(raioKm: NumeroEntrada): string {
  const numero = paraNumero(raioKm);
  return numero === null ? SEM_VALOR : `${formatadorRaio.format(numero)} km`;
}

export function rotuloPropostasPendentes(total: number): string {
  return total === 1 ? '1 proposta pendente' : `${total} propostas pendentes`;
}

// Mesma tabela do ResumoCarga: status sempre em texto + ícone; expirada usa a borda tracejada.
const VARIANTE_STATUS: Record<StatusDisponibilidade, VarianteEtiqueta> = {
  aberto: 'ok',
  em_negociacao: 'info',
  fechado: 'neutro',
  cancelado: 'erro',
  expirado: 'tracejada',
};

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[3],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    // Expirada (CT-10, DS 6): borda tracejada e fundo rebaixado.
    expirado: { borderStyle: 'dashed' } satisfies ViewStyle,
    topo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space[2],
    } satisfies ViewStyle,
  } as const;
}

/**
 * Disponibilidade do motorista: `article` com o local como título (h2), "Ativa" quando é a em uso,
 * urgência, status (aberto vencido vira "Expirada"), raio, prazo e propostas pendentes. "Usar esta"
 * tem nome único por disponibilidade; só funciona em aberta, no prazo e que não seja a ativa
 * (nas demais fica desabilitado, como no protótipo).
 */
export function CartaoDisponibilidade({
  id,
  local,
  raioKm,
  urgencia,
  status,
  expiraEm,
  propostasPendentes,
  ativa,
  aoUsar,
  agora,
}: PropsCartaoDisponibilidade) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const efetivo = statusEfetivo(status, expiraEm, agora);
  const expirado = efetivo === 'expirado';
  const utilizavel = efetivo === 'aberto';
  const rotuloLocal = rotuloLocalDisponibilidade(local);
  const idTitulo = `disponibilidade-${id}-titulo`;

  const fatos: ItemDeFato[] = [
    { rotulo: 'Raio de busca', valor: rotuloRaio(raioKm) },
    { rotulo: expirado ? 'Prazo vencido em' : 'Expira em', valor: formatarDataHora(expiraEm) },
  ];

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        expirado ? estilos.expirado : null,
        {
          backgroundColor: expirado ? colors.bg.sunken : colors.bg.surface,
          borderColor: colors.border.subtle,
        },
      ]}
    >
      <View style={estilos.topo}>
        {ativa ? (
          <Etiqueta variante="novo" icone="check">
            Ativa
          </Etiqueta>
        ) : null}
        <SeloUrgencia urgencia={urgencia} />
        <Etiqueta variante={VARIANTE_STATUS[efetivo]}>
          {rotuloStatusDisponibilidade(efetivo)}
        </Etiqueta>
      </View>
      <Texto nivel="lg" peso="bold" role="heading" aria-level={2} nativeID={idTitulo}>
        {rotuloLocal}
      </Texto>
      <ListaDeFatos itens={fatos} />
      {propostasPendentes === undefined ? null : (
        <Texto cor="secundario">{rotuloPropostasPendentes(propostasPendentes)}</Texto>
      )}
      {!ativa && aoUsar ? (
        <Botao
          variante="secundario"
          desabilitado={!utilizavel}
          aria-label={`Usar esta disponibilidade ${rotuloLocal.charAt(0).toLowerCase()}${rotuloLocal.slice(1)}`}
          aoPressionar={() => aoUsar(id)}
        >
          Usar esta
        </Botao>
      ) : null}
    </View>
  );
}
