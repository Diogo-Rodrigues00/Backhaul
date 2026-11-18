// Minhas disponibilidades do motorista (MVP-11, CT-01 a CT-10; cancelar: MVP-22, card 034). Só a casca
// (h1, cabeçalho, abas, "Publicar disponibilidade") fica no JS inicial da rota; a lista e o cancelar
// carregam por React.lazy logo depois, com o cliente de dados (ADR 0011 e ADR 0004, adendo). A lista e
// a ativa vêm do provider da área (DisponibilidadeAtivaProvider), que também cuida do plano B.
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { Link } from '@/components/atoms/Link';
import { carregarCorpoMinhasDisponibilidades } from '@/telas/CorpoMinhasDisponibilidades.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

export default function MinhasDisponibilidades() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Minhas disponibilidades"
      descricao="Onde você está disponível. A ativa define as cargas próximas que você vê."
      cabecalho={cabecalho}
      abas={abas}
      acoes={
        <Link href="/motorista/disponibilidades/nova" aparencia={{ icone: 'plus' }}>
          Publicar disponibilidade
        </Link>
      }
    >
      <CorpoSobDemanda
        carregar={carregarCorpoMinhasDisponibilidades}
        carregando={
          <ConteudoLista estado="carregando" textoCarregando="Carregando disponibilidades…" />
        }
      />
    </TemplateTela>
  );
}
