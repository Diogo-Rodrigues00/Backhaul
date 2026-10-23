// Corpo da tela "Cargas próximas" (card 024, MVP-12, D-PO-03/04/05, CT-01 a CT-08): a busca parte da
// disponibilidade ativa e a lista vem na ordem da API (urgência, depois distância); o front não
// reordena. Carregado por React.lazy a partir de `app/motorista/cargas.tsx` (ADR 0011), por isso
// fica fora do JS inicial da rota.
import { lazy, Suspense, useCallback, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useCargasProximas } from '@/api/cargas';
import { useMinhasPropostas } from '@/api/propostas';
import type { ParametrosCargasProximas } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Banner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import { AcoesProposta } from '@/components/organisms/AcoesProposta';
import { BarraContexto } from '@/components/organisms/BarraContexto';
import {
  CartaoCargaProxima,
  LOCAL_NAO_IDENTIFICADO,
} from '@/components/organisms/CartaoCargaProxima';
import { rotuloRaio } from '@/components/organisms/CartaoDisponibilidade';
import { carregarFormularioProposta } from '@/components/organisms/FormularioProposta.carregar';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { rotuloDoLocal } from '@/lib/cidades';
import { ErroApi } from '@/lib/erros';
import { descreverCarga } from '@/lib/fazerProposta';
import { paraNumero } from '@/lib/numeros';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { usePropostasDoMotorista } from './usePropostasDoMotorista';

const ROTA_PUBLICAR = '/motorista/disponibilidades/nova';

// Diálogo de proposta (card 025): só é baixado na primeira vez que o motorista pede uma proposta.
const FormularioProposta = lazy(carregarFormularioProposta);

/** Mensagem do servidor quando é de negócio (400, 403, 404); 500 e falha de rede usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && (erro.tipo === 'mensagem' || erro.tipo === 'validacao')
    ? erro.mensagens.join(' ')
    : undefined;
}

function criarEstilos({ space }: TemaVisual) {
  return { pilha: { gap: space[4] } satisfies ViewStyle } as const;
}

export default function CorpoCargasProximas() {
  const estilos = useEstilos(criarEstilos);
  const { habilitado } = useCasca();
  const {
    ativa,
    carregando: carregandoAtiva,
    erro: erroAtiva,
    atualizar: atualizarAtiva,
  } = useDisponibilidadeAtiva();

  // D-PO-03: lat, lng e raio da disponibilidade ativa. Sem ativa a consulta fica parada.
  const lat = ativa?.local.lat;
  const lng = ativa?.local.lng;
  const raio = ativa ? paraNumero(ativa.raio_busca_km) : null;
  const parametros = useMemo<ParametrosCargasProximas | null>(
    () =>
      lat === undefined || lng === undefined || raio === null ? null : { lat, lng, raio_km: raio },
    [lat, lng, raio],
  );
  const cargas = useCargasProximas(parametros, { habilitado });

  // D-PO-05 e MVP-13: a lista real de propostas (proposta 4a) prevalece; sem ela (404, erro), vale o que
  // este aparelho guardou ao enviar. Falha aqui nunca impede a lista, só deixa de marcar.
  const propostas = useMinhasPropostas({ habilitado });
  const refazerCargas = cargas.refetch;
  const refazerPropostas = propostas.refetch;
  const recarregarListas = useCallback(
    () => Promise.all([refazerCargas(), refazerPropostas()]),
    [refazerCargas, refazerPropostas],
  );
  const {
    pendentes,
    comContraproposta,
    avisos,
    avisoDaCarga,
    refAvisoDaCarga,
    registrarMarcador,
    abrir,
    dialogo,
    lerGuardadas,
  } = usePropostasDoMotorista({
    daApi: propostas.data,
    disponibilidadeId: ativa?.id,
    recarregarListas,
  });
  const atualizar = useCallback(
    () => Promise.all([recarregarListas(), lerGuardadas()]),
    [recarregarListas, lerGuardadas],
  );

  const publicar = (
    <Link href={ROTA_PUBLICAR} aparencia={{ icone: 'plus' }} variante="botao">
      Publicar disponibilidade
    </Link>
  );

  // Ainda não dá para saber a ativa, ou a lista de disponibilidades falhou: sem ela não há busca.
  if (!ativa) {
    const estado: EstadoLista = erroAtiva ? 'erro' : carregandoAtiva ? 'carregando' : 'vazio';
    return (
      <ConteudoLista
        estado={estado}
        textoCarregando="Carregando cargas…"
        vazio={{
          titulo: 'Publique uma disponibilidade para ver cargas perto de você',
          descricao:
            'Diga onde você está e até onde aceita ir. As cargas abertas por perto aparecem aqui, das mais urgentes para as menos.',
          acao: publicar,
          icone: 'locate',
        }}
        erro={{ mensagem: mensagemDeErro(erroAtiva) }}
        aoAtualizar={erroAtiva ? () => atualizarAtiva() : undefined}
      />
    );
  }

  const lista = cargas.data?.cargas ?? [];
  const estado: EstadoLista = cargas.isError
    ? 'erro'
    : parametros === null || cargas.isPending
      ? 'carregando'
      : lista.length === 0
        ? 'vazio'
        : 'pronto';

  return (
    <>
      <BarraContexto local={ativa.local} raioKm={ativa.raio_busca_km} expiraEm={ativa.expira_em} />
      {avisoDaCarga ? (
        // Foco programático (volta do diálogo): fora da ordem do Tab. O anúncio sai por `anunciar`.
        <View ref={refAvisoDaCarga} tabIndex={-1}>
          <Banner variante="aviso" titulo="Carga indisponível" anunciar={false}>
            {`${avisoDaCarga} A lista foi atualizada.`}
          </Banner>
        </View>
      ) : null}
      <ConteudoLista
        estado={estado}
        textoCarregando="Carregando cargas…"
        vazio={{
          titulo: `Nenhuma carga aberta num raio de ${rotuloRaio(ativa.raio_busca_km)}`,
          descricao:
            'Não há cargas abertas por perto agora. Publique uma disponibilidade com um raio maior para ver mais cargas.',
          acao: (
            <Link href={ROTA_PUBLICAR} aparencia={{ icone: 'plus' }} variante="botao">
              Publicar disponibilidade com raio maior
            </Link>
          ),
          icone: 'locate',
        }}
        erro={{ mensagem: mensagemDeErro(cargas.error) }}
        aoAtualizar={atualizar}
        atualizando={cargas.isFetching}
      >
        <View style={estilos.pilha}>
          <Texto cor="secundario">Ordem: urgência primeiro, depois a distância até a coleta.</Texto>
          <Lista
            rotulo="Cargas próximas"
            itens={lista}
            chave={(carga) => carga.id}
            renderizarItem={(carga) => {
              const descricao = descreverCarga(
                carga.tipo_carga,
                rotuloDoLocal(carga.origem) ?? LOCAL_NAO_IDENTIFICADO,
                rotuloDoLocal(carga.destino) ?? LOCAL_NAO_IDENTIFICADO,
              );
              const base = {
                cargaId: carga.id,
                descricaoDaCarga: descricao,
                empresa: carga.empresa,
                valorOferecido: carga.valor_oferecido,
              };
              return (
                <CartaoCargaProxima
                  id={carga.id}
                  tipoCarga={carga.tipo_carga}
                  empresa={carga.empresa}
                  origem={carga.origem}
                  destino={carga.destino}
                  pesoKg={carga.peso_kg}
                  valorOferecido={carga.valor_oferecido}
                  urgencia={carga.urgencia}
                  certificacao={carga.certificacao_exigida}
                  expiraEm={carga.expira_em}
                  distanciaKm={carga.distancia_origem_km}
                  propostaEnviada={pendentes.has(carga.id)}
                  refPropostaEnviada={(no) => registrarMarcador(carga.id, no)}
                  acoes={
                    // Só com a lista de propostas conhecida: antes disso uma proposta pendente ainda
                    // não apareceria como "Proposta enviada" e daria para mandar um aceite duplicado.
                    propostas.isPending ? undefined : (
                      <AcoesProposta
                        descricaoDaCarga={descricao}
                        valorOferecido={carga.valor_oferecido}
                        contrapropostaDisponivel={!comContraproposta.has(carga.id)}
                        aviso={avisos[carga.id]}
                        aoAceitar={(origem) => abrir({ ...base, tipo: 'aceite' }, origem)}
                        aoContrapropor={(origem) =>
                          abrir({ ...base, tipo: 'contraproposta' }, origem)
                        }
                      />
                    )
                  }
                />
              );
            }}
          />
        </View>
      </ConteudoLista>
      {dialogo.montado ? (
        <Suspense fallback={null}>
          <FormularioProposta
            pedido={dialogo.pedido}
            aberto={dialogo.aberto}
            enviando={dialogo.enviando}
            erro={dialogo.erro}
            aoEnviar={dialogo.aoEnviar}
            aoFechar={dialogo.aoFechar}
            refRetorno={dialogo.refRetorno}
          />
        </Suspense>
      ) : null}
    </>
  );
}
