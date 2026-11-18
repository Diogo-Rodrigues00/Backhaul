import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoFretesAdmin } from '@/telas/CorpoFretesAdmin.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Fretes da plataforma para o admin (card 041). Só a casca (h1, cabeçalho, abas) fica no JS inicial
// da rota: a consulta e os cartões carregam por React.lazy logo depois (ADR 0011 e ADR 0004, adendo).
// Título e frase fixos: estão no HTML estático.
export default function FretesDoAdministrador() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Fretes da plataforma"
      descricao="Acompanhe os fretes mais recentes, com pagamento e comissão."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoFretesAdmin}
        carregando={<ConteudoLista estado="carregando" textoCarregando="Carregando fretes…" />}
      />
    </TemplateTela>
  );
}
