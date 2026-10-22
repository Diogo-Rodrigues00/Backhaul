// Dados do motorista (ResumoMotorista, DS 5.2): nome, veículo, capacidade e certificações.
// Validade só como data (D-PO-12); situação da certificação sempre por texto.
import { Platform, View } from 'react-native';

import { Etiqueta } from '@/components/atoms/Etiqueta';
import { Texto } from '@/components/atoms/Texto';
import { formatarPeso, formatarValidade, type NumeroEntrada } from '@/lib/formatacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { ListaDeFatos } from './ListaDeFatos';

export interface CertificacaoResumida {
  nome: string;
  /** Data de validade: 'YYYY-MM-DD' ou ISO com hora. Mostrada só como data. */
  validade: string;
  /** `validado_por_admin` da API. */
  aprovada: boolean;
}

export interface PropsResumoMotorista {
  nome: string;
  /** Tipo do veículo (`veiculo_tipo`). */
  veiculo: string;
  placa: string;
  capacidadeKg: NumeroEntrada;
  certificacoes: readonly CertificacaoResumida[];
  /**
   * Não repete o nome: o cartão que já o mostra como título (`h3` do CartaoProposta) usa o resumo
   * só para o veículo e as certificações.
   */
  ocultarNome?: boolean;
}

function criarEstilos({ space: espaco }: TemaVisual) {
  return {
    bloco: { gap: espaco[3] },
    lista: { gap: espaco[3] },
    certificacao: { gap: espaco[1] },
  } as const;
}

/** Quem dirige: nome, veículo, capacidade e certificações com a situação de cada uma. */
export function ResumoMotorista({
  nome,
  veiculo,
  placa,
  capacidadeKg,
  certificacoes,
  ocultarNome = false,
}: PropsResumoMotorista) {
  const estilos = useEstilos(criarEstilos);
  return (
    <View style={estilos.bloco}>
      {ocultarNome ? null : <Texto nivel="lg">{nome}</Texto>}
      <ListaDeFatos
        itens={[
          { rotulo: 'Veículo', valor: veiculo },
          { rotulo: 'Placa', valor: placa },
          { rotulo: 'Capacidade', valor: formatarPeso(capacidadeKg) },
        ]}
      />
      <Texto nivel="sm" cor="secundario">
        Certificações
      </Texto>
      {certificacoes.length === 0 ? (
        <Texto nivel="base">Nenhuma certificação cadastrada.</Texto>
      ) : (
        <View role="list" style={estilos.lista}>
          {certificacoes.map((certificacao, indice) => (
            <View
              key={`${indice}-${certificacao.nome}`}
              role="listitem"
              // No iPhone, a certificação é lida de uma vez: nome, validade e situação.
              accessible={Platform.OS !== 'web'}
              style={estilos.certificacao}
            >
              <Texto nivel="base" peso="bold">
                {certificacao.nome}
              </Texto>
              <Texto nivel="sm">{`Validade: ${formatarValidade(certificacao.validade)}`}</Texto>
              <Etiqueta variante={certificacao.aprovada ? 'ok' : 'erro'}>
                {certificacao.aprovada ? 'Aprovada' : 'Não aprovada'}
              </Etiqueta>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
