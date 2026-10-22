// Corpo da tela "Cargas próximas" (card 024, MVP-12, D-PO-03/04/05, CT-01 a CT-08): a busca parte da
// disponibilidade ativa e a lista vem na ordem da API (urgência, depois distância); o front não
// reordena. Carregado por React.lazy a partir de `app/motorista/cargas.tsx` (ADR 0011), por isso
// fica fora do JS inicial da rota.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useCargasProximas } from '@/api/cargas';
import { useMinhasPropostas } from '@/api/propostas';
import type { ParametrosCargasProximas } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Lista } from '@/components/molecules/Lista';
import { BarraContexto } from '@/components/organisms/BarraContexto';
import { CartaoCargaProxima } from '@/components/organisms/CartaoCargaProxima';
import { rotuloRaio } from '@/components/organisms/CartaoDisponibilidade';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { ErroApi } from '@/lib/erros';
import { paraNumero } from '@/lib/numeros';
import { lerPropostasEnviadas, type PropostaEnviada } from '@/lib/propostasEnviadas';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

const ROTA_PUBLICAR = '/motorista/disponibilidades/nova';

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

  // D-PO-05: a lista real (proposta 4a) prevalece; sem ela (404, erro), vale o que este aparelho
  // guardou ao enviar propostas. Falha aqui nunca impede a lista, só deixa de marcar.
  const propostas = useMinhasPropostas({ habilitado });
  const [guardadas, setGuardadas] = useState<readonly PropostaEnviada[]>([]);
  const lerGuardadas = useCallback(async () => {
    setGuardadas(await lerPropostasEnviadas());
  }, []);
  useEffect(() => {
    let cancelado = false;
    void lerPropostasEnviadas().then((lista) => {
      if (!cancelado) setGuardadas(lista);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const comPropostaPendente = useMemo(
    () =>
      propostas.data
        ? new Set(
            propostas.data.propostas
              .filter((proposta) => proposta.status === 'pendente')
              .map((proposta) => proposta.carga.id),
          )
        : new Set(guardadas.map((proposta) => proposta.cargaId)),
    [propostas.data, guardadas],
  );

  const refazerCargas = cargas.refetch;
  const refazerPropostas = propostas.refetch;
  const atualizar = useCallback(
    () => Promise.all([refazerCargas(), refazerPropostas(), lerGuardadas()]),
    [refazerCargas, refazerPropostas, lerGuardadas],
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
            renderizarItem={(carga) => (
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
                propostaEnviada={comPropostaPendente.has(carga.id)}
              />
            )}
          />
        </View>
      </ConteudoLista>
    </>
  );
}
