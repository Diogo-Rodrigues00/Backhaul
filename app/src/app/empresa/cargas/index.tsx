// Minhas cargas da empresa (MVP-09, CT-01 a CT-10). Sem atualização automática (Q5): só "Atualizar".
import { useMinhasCargas } from '@/api/cargas.hooks';
import { Link } from '@/components/atoms/Link';
import { Lista } from '@/components/molecules/Lista';
import { CartaoCargaEmpresa } from '@/components/organisms/CartaoCargaEmpresa';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { ErroApi } from '@/lib/erros';

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

export default function MinhasCargas() {
  const { cabecalho, abas, habilitado } = useCasca();
  const consulta = useMinhasCargas({ habilitado });
  const cargas = consulta.data?.cargas ?? [];

  const estado: EstadoLista = consulta.isError
    ? 'erro'
    : consulta.isPending
      ? 'carregando'
      : cargas.length === 0
        ? 'vazio'
        : 'pronto';

  const publicarCarga = (
    <Link href="/empresa/cargas/nova" aparencia={{ icone: 'plus' }}>
      Publicar carga
    </Link>
  );

  return (
    <TemplateLista
      titulo="Minhas cargas"
      descricao="As cargas que você publicou, com o status e o número de propostas de cada uma."
      cabecalho={cabecalho}
      abas={abas}
      acoes={publicarCarga}
      estado={estado}
      textoCarregando="Carregando cargas…"
      vazio={{
        titulo: 'Você ainda não publicou cargas',
        descricao: 'Publique uma carga para os motoristas verem e fazerem propostas.',
        acao: publicarCarga,
        icone: 'package',
      }}
      erro={{ mensagem: mensagemDeErro(consulta.error) }}
      aoAtualizar={() => consulta.refetch()}
      atualizando={consulta.isFetching}
    >
      <Lista
        rotulo="Cargas publicadas"
        itens={cargas}
        chave={(carga) => carga.id}
        renderizarItem={(carga) => (
          <CartaoCargaEmpresa
            id={carga.id}
            tipoCarga={carga.tipo_carga}
            origem={carga.origem}
            destino={carga.destino}
            pesoKg={carga.peso_kg}
            valorOferecido={carga.valor_oferecido}
            urgencia={carga.urgencia}
            certificacao={carga.certificacao_exigida}
            expiraEm={carga.expira_em}
            status={carga.status}
            totalPropostas={carga.total_propostas}
          />
        )}
      />
    </TemplateLista>
  );
}
