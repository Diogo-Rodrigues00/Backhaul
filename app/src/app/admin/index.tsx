import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoResumoAdmin } from '@/telas/CorpoResumoAdmin.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Resumo da plataforma (card 040). Só a casca (h1, cabeçalho, abas) fica no JS inicial da rota: a
// consulta e os números carregam por React.lazy logo depois, junto com o cliente de dados (ADR 0011
// e ADR 0004, adendo). Título e frase fixos: estão no HTML estático.
export default function Administrador() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Resumo da plataforma"
      descricao="Acompanhe pessoas, cargas, fretes e dinheiro da plataforma."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoResumoAdmin}
        carregando={<ConteudoLista estado="carregando" textoCarregando="Carregando resumo…" />}
      />
    </TemplateTela>
  );
}
