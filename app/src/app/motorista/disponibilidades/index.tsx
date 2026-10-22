// Minhas disponibilidades do motorista (MVP-11, CT-01 a CT-10). Sem atualização automática: só
// "Atualizar". A lista e a ativa vêm do provider da área (ver DisponibilidadeAtivaProvider), que
// também cuida do plano B enquanto `GET /disponibilidades/minhas` não existe.
import { Link } from '@/components/atoms/Link';
import { Lista } from '@/components/molecules/Lista';
import {
  CartaoDisponibilidade,
  rotuloLocalDisponibilidade,
} from '@/components/organisms/CartaoDisponibilidade';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { anunciar } from '@/lib/a11y';
import { ErroApi } from '@/lib/erros';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

export default function MinhasDisponibilidades() {
  const { cabecalho, abas } = useCasca();
  const { ativa, carregando, disponibilidades, erro, definirAtiva, atualizar, atualizando } =
    useDisponibilidadeAtiva();

  const estado: EstadoLista = erro
    ? 'erro'
    : carregando
      ? 'carregando'
      : disponibilidades.length === 0
        ? 'vazio'
        : 'pronto';

  const publicar = (
    <Link href="/motorista/disponibilidades/nova" aparencia={{ icone: 'plus' }}>
      Publicar disponibilidade
    </Link>
  );

  // Anuncia na região viva (sem mover o foco): quem usa leitor de tela precisa saber que mudou.
  const usar = (id: string) => {
    const escolhida = disponibilidades.find((item) => item.id === id);
    definirAtiva(id);
    if (escolhida) {
      const local = rotuloLocalDisponibilidade(escolhida.local);
      anunciar(`Disponibilidade ativa: ${local.charAt(0).toLowerCase()}${local.slice(1)}`);
    }
  };

  return (
    <TemplateLista
      titulo="Minhas disponibilidades"
      descricao="Onde você está disponível. A ativa define as cargas próximas que você vê."
      cabecalho={cabecalho}
      abas={abas}
      acoes={publicar}
      estado={estado}
      textoCarregando="Carregando disponibilidades…"
      vazio={{
        titulo: 'Nenhuma disponibilidade publicada',
        descricao: 'Publique uma disponibilidade para ver as cargas perto de você.',
        acao: publicar,
        icone: 'locate',
      }}
      erro={{ mensagem: mensagemDeErro(erro) }}
      aoAtualizar={() => atualizar()}
      atualizando={atualizando}
    >
      <Lista
        rotulo="Disponibilidades publicadas"
        itens={disponibilidades}
        chave={(item) => item.id}
        renderizarItem={(item) => (
          <CartaoDisponibilidade
            id={item.id}
            local={item.local}
            raioKm={item.raio_busca_km}
            urgencia={item.urgencia}
            status={item.status}
            expiraEm={item.expira_em}
            propostasPendentes={item.propostas_pendentes}
            ativa={ativa?.id === item.id}
            aoUsar={usar}
          />
        )}
      />
    </TemplateLista>
  );
}
