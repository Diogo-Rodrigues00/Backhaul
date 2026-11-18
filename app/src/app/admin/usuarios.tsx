import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoUsuariosAdmin } from '@/telas/CorpoUsuariosAdmin.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Usuários da plataforma para o admin (card 041). Só a casca (h1, cabeçalho, abas) fica no JS inicial
// da rota: a consulta e os cartões carregam por React.lazy logo depois (ADR 0011 e ADR 0004, adendo).
// Título e frase fixos: estão no HTML estático.
export default function UsuariosDoAdministrador() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Usuários da plataforma"
      descricao="Veja quem está cadastrado, com perfil e situação."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoUsuariosAdmin}
        carregando={<ConteudoLista estado="carregando" textoCarregando="Carregando usuários…" />}
      />
    </TemplateTela>
  );
}
