import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista } from '@/components/templates/TemplateLista';
import { TemplateTela } from '@/components/templates/TemplateTela';
import { carregarCorpoFretesDaEmpresa } from '@/telas/CorpoFretesDaEmpresa.carregar';
import { CorpoSobDemanda } from '@/telas/CorpoSobDemanda';

// Meus fretes da empresa (MVP-17). Só a casca (h1, cabeçalho, abas) fica no JS inicial da rota: a
// consulta, a atualização automática e o pagamento carregam por React.lazy logo depois, junto com o
// cliente de dados (ADR 0011 e ADR 0004, adendo). Título e frase fixos: estão no HTML estático.

export default function FretesDaEmpresa() {
  const { cabecalho, abas } = useCasca();
  return (
    <TemplateTela
      titulo="Meus fretes"
      descricao="Acompanhe a entrega de cada frete e pague pela plataforma."
      cabecalho={cabecalho}
      abas={abas}
    >
      <CorpoSobDemanda
        carregar={carregarCorpoFretesDaEmpresa}
        carregando={<ConteudoLista estado="carregando" textoCarregando="Carregando fretes…" />}
      />
    </TemplateTela>
  );
}
