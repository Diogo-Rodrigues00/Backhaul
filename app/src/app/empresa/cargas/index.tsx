import { Link } from '@/components/atoms/Link';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoMinhasCargas } from '@/telas/CorpoMinhasCargas.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Minhas cargas da empresa (MVP-09). Só a casca (h1, cabeçalho, abas, "Publicar carga") fica no JS
// inicial da rota: a consulta e a lista carregam por React.lazy logo depois, junto com o cliente de
// dados (ADR 0011 e ADR 0004, adendo).

export default function MinhasCargas() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Minhas cargas"
      descricao="As cargas que você publicou, com o status e o número de propostas de cada uma."
      cabecalho={cabecalho}
      abas={abas}
      acoes={
        <Link href="/empresa/cargas/nova" aparencia={{ icone: 'plus' }}>
          Publicar carga
        </Link>
      }
    >
      <CorpoSobDemanda
        carregar={carregarCorpoMinhasCargas}
        carregando={<ConteudoLista estado="carregando" textoCarregando="Carregando cargas…" />}
      />
    </TemplateTela>
  );
}
