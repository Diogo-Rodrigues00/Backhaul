// Cartão de proposta do motorista (PropostaCard motorista, DS 5.2, cards 026 e 050): tipo da carga,
// empresa, rota, urgência, certificação exigida, tipo e status em texto, os dois valores e, só quando
// aceita e com frete, o link "Ver frete". Quando a carga saiu do ar (fechada, cancelada, vencida) o cartão
// diz "Carga indisponível" em texto e selo. Não busca nem recebe nada além de props: a tela entrega os
// dados (ADR 0003).
import { useId, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import type { NomeIcone } from '@/components/atoms/icones';
import { Etiqueta, type VarianteEtiqueta } from '@/components/atoms/Etiqueta';
import { Link } from '@/components/atoms/Link';
import { Preco } from '@/components/atoms/Preco';
import { SeloUrgencia } from '@/components/atoms/SeloUrgencia';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { BotaoConversa } from '@/components/molecules/BotaoConversa';
import { LinhaRota } from '@/components/molecules/LinhaRota';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { rotuloDoLocal, type Coordenada } from '@/lib/cidades';
import { ROTULO_CARGA_INDISPONIVEL } from '@/lib/cargaDaProposta';
import { formatarDataHora, formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import { paraNumero } from '@/lib/numeros';
import { QUEBRA_ONDE_PRECISAR } from '@/lib/quebraDeTexto';
import {
  rotuloStatusProposta,
  type StatusProposta,
  type TipoProposta,
  type Urgencia,
} from '@/lib/rotulos';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

export interface PropsCartaoMinhaProposta {
  /** `tipo_carga` da proposta: é o título do cartão. */
  tipoCarga: string;
  empresa: string;
  tipo: TipoProposta;
  status: StatusProposta;
  valorOferecido: NumeroEntrada;
  valorProposto: NumeroEntrada;
  /** ISO 8601 (`criado_em`). */
  criadoEm: string;
  /** Só vem preenchido quando a proposta foi aceita (contrato de `GET /propostas/minhas`). */
  freteId: string | null;
  /** Coleta e entrega (`origem` e `destino` da carga): viram "Cidade - UF". Sem elas, a rota não aparece. */
  origem?: Coordenada;
  destino?: Coordenada;
  /** Urgência da carga; sem ela, o selo não aparece. */
  urgencia?: Urgencia;
  /** Nome da certificação exigida; `null` = "Sem exigência"; `undefined` = a linha não aparece. */
  certificacao?: string | null;
  /**
   * Por que a carga não aceita mais proposta (`motivoCargaIndisponivel`); `null`/ausente = segue aberta.
   * Com motivo, o cartão ganha o selo "Carga indisponível" e a frase, e a borda tracejada do DS.
   */
  motivoIndisponivel?: string | null;
  /** Slot do rodapé, ao lado de "Ver frete". */
  children?: ReactNode;
  /**
   * Chat da proposta (card 043, ADR 0016). Com `aoAlternarConversa` e `idConversa` o cartão mostra o
   * `BotaoConversa` ("Abrir conversa com <empresa> sobre <carga>"); `conversa` é o painel, que a tela
   * monta sob demanda só enquanto `conversaAberta`.
   */
  conversaAberta?: boolean;
  aoAlternarConversa?: () => void;
  /** Mesmo `id` do painel em `conversa` (alvo do `aria-controls`); veja `idDoPainelDaConversa`. */
  idConversa?: string;
  conversa?: ReactNode;
}

// Cor do selo por status (DS: status vai em texto + ícone, a cor só reforça).
const VARIANTE_STATUS: Record<StatusProposta, VarianteEtiqueta> = {
  pendente: 'neutro',
  aceita: 'ok',
  recusada: 'erro',
  expirada: 'tracejada',
};
// Ícones do protótipo: ampulheta para pendente; os demais usam o ícone padrão da variante.
const ICONE_STATUS: Partial<Record<StatusProposta, NomeIcone>> = { pendente: 'hourglass' };

const ICONE_TIPO: Record<TipoProposta, NomeIcone> = { aceite: 'send', contraproposta: 'refresh' };

// Rótulo do tipo neste cartão (protótipo: "Proposta" = aceitou o valor oferecido). Local, e não em
// `rotulos.ts`, porque "Aceita o valor" ao lado do status "Aceita" confundia. Outras telas seguem com o
// rótulo de `rotulos.ts`.
const ROTULO_TIPO: Record<TipoProposta, string> = {
  aceite: 'Proposta',
  contraproposta: 'Contraproposta',
};

// Teto do botão de conversa em telas largas (no celular ele só estica até o cartão).
const LARGURA_MAXIMA_DA_ACAO = 360;

/** Texto do ponto sem cidade na lista (coordenada fora do mapa). */
const LOCAL_NAO_IDENTIFICADO = 'Local não identificado';

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    cartao: {
      gap: space[4],
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    // Carga indisponível (DS 6, como "Expirada"): borda tracejada e fundo rebaixado.
    indisponivel: { borderStyle: 'dashed' } satisfies ViewStyle,
    linha: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] } satisfies ViewStyle,
    valores: { flexDirection: 'row', flexWrap: 'wrap', gap: space[6] } satisfies ViewStyle,
    rodape: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space[3],
    } satisfies ViewStyle,
    acaoConversa: {
      alignSelf: 'stretch',
      minWidth: 0,
      maxWidth: LARGURA_MAXIMA_DA_ACAO,
    } satisfies ViewStyle,
    conversa: {
      minWidth: 0,
      paddingTop: space[4],
      borderTopWidth: border.width,
    } satisfies ViewStyle,
  } as const;
}

/**
 * Frase da diferença entre o valor oferecido e o da proposta. Aceite: aceitou o valor. Contraproposta:
 * repete, ou fica "R$ X abaixo/acima". Sem número válido, não há frase (a tela segue sem ela).
 */
export function fraseDaDiferenca(
  tipo: TipoProposta,
  valorOferecido: NumeroEntrada,
  valorProposto: NumeroEntrada,
): string | null {
  if (tipo === 'aceite') return 'Você aceitou o valor oferecido pela empresa.';
  const oferecido = paraNumero(valorOferecido);
  const proposto = paraNumero(valorProposto);
  if (oferecido === null || proposto === null) return null;
  // Centavos: evita que 3500.1 - 3200.1 vire um resto de ponto flutuante.
  const diferenca = Math.round((oferecido - proposto) * 100) / 100;
  if (diferenca === 0) return 'Sua contraproposta repete o valor oferecido.';
  const lado = diferenca > 0 ? 'abaixo' : 'acima';
  return `Sua contraproposta é ${formatarMoeda(Math.abs(diferenca))} ${lado} do valor oferecido.`;
}

/**
 * Proposta do motorista: `article` com o tipo da carga como `h2` (o título que o leitor de tela anuncia
 * ao entrar no cartão), a empresa, tipo e status, os valores, a frase da diferença, quando foi enviada
 * e "Ver frete" (vai para Meus fretes) só se a proposta foi aceita e já tem `frete_id`.
 */
export function CartaoMinhaProposta({
  tipoCarga,
  empresa,
  tipo,
  status,
  valorOferecido,
  valorProposto,
  criadoEm,
  freteId,
  origem,
  destino,
  urgencia,
  certificacao,
  motivoIndisponivel = null,
  children,
  conversaAberta = false,
  aoAlternarConversa,
  idConversa,
  conversa,
}: PropsCartaoMinhaProposta) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const idTitulo = `${useId()}-proposta`;
  const diferenca = fraseDaDiferenca(tipo, valorOferecido, valorProposto);
  const comFrete = status === 'aceita' && freteId !== null;
  const indisponivel = motivoIndisponivel !== null;

  return (
    <View
      role="article"
      aria-labelledby={idTitulo}
      style={[
        estilos.cartao,
        indisponivel ? estilos.indisponivel : null,
        {
          backgroundColor: indisponivel ? colors.bg.sunken : colors.bg.surface,
          borderColor: colors.border.subtle,
        },
      ]}
    >
      <Titulo nivel={2} nativeID={idTitulo} style={QUEBRA_ONDE_PRECISAR}>
        {tipoCarga}
      </Titulo>
      <Texto cor="secundario" style={QUEBRA_ONDE_PRECISAR}>
        {`Empresa: ${empresa}`}
      </Texto>
      {origem && destino ? (
        <LinhaRota
          origem={rotuloDoLocal(origem) ?? LOCAL_NAO_IDENTIFICADO}
          destino={rotuloDoLocal(destino) ?? LOCAL_NAO_IDENTIFICADO}
        />
      ) : null}
      <View style={estilos.linha}>
        {urgencia ? <SeloUrgencia urgencia={urgencia} /> : null}
        <Etiqueta icone={ICONE_TIPO[tipo]}>{ROTULO_TIPO[tipo]}</Etiqueta>
        <Etiqueta variante={VARIANTE_STATUS[status]} icone={ICONE_STATUS[status]}>
          {rotuloStatusProposta(status)}
        </Etiqueta>
        {indisponivel ? (
          <Etiqueta variante="tracejada" icone="triangle-alert">
            {ROTULO_CARGA_INDISPONIVEL}
          </Etiqueta>
        ) : null}
      </View>
      <View style={estilos.valores}>
        <Preco valor={valorOferecido} rotulo="Valor oferecido pela empresa" />
        <Preco valor={valorProposto} rotulo="Seu valor" />
      </View>
      {certificacao === undefined ? null : (
        <ListaDeFatos
          itens={[
            {
              rotulo: 'Certificação',
              valor:
                certificacao === null ? (
                  'Sem exigência'
                ) : (
                  <Etiqueta variante="info">{`Exige ${certificacao}`}</Etiqueta>
                ),
            },
          ]}
        />
      )}
      {diferenca ? <Texto cor="secundario">{diferenca}</Texto> : null}
      {indisponivel ? <Texto cor="secundario">{motivoIndisponivel}</Texto> : null}
      <View style={estilos.rodape}>
        <Texto nivel="sm" cor="secundario">
          {`Enviada em ${formatarDataHora(criadoEm)}`}
        </Texto>
        {comFrete ? (
          <Link href="/motorista/fretes" variante="botao" aparencia={{ variante: 'secundario' }}>
            {`Ver frete de ${tipoCarga}`}
          </Link>
        ) : null}
        {children}
      </View>
      {aoAlternarConversa && idConversa ? (
        <View style={estilos.acaoConversa}>
          <BotaoConversa
            aberta={conversaAberta}
            // A data de envio (que o cartão já mostra) torna o nome único mesmo com duas propostas da
            // mesma empresa para a mesma carga (WCAG 2.4.6); o texto visível segue "Abrir conversa".
            nome={`${empresa} sobre ${tipoCarga}, enviada em ${formatarDataHora(criadoEm)}`}
            idDoPainel={idConversa}
            aoAlternar={aoAlternarConversa}
          />
        </View>
      ) : null}
      {conversaAberta && conversa ? (
        <View style={[estilos.conversa, { borderTopColor: colors.border.subtle }]}>{conversa}</View>
      ) : null}
    </View>
  );
}
